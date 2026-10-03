package de.gassi.service;

import de.gassi.domain.Aufgabe;
import de.gassi.domain.Bereich;
import de.gassi.domain.Teammitglied;
import de.gassi.domain.Zuteilung;
import de.gassi.domain.Zeitfenster;
import de.gassi.dto.AufgabeDto;
import de.gassi.dto.PlanDto;
import de.gassi.dto.ZuteilungDto;
import de.gassi.exception.BusinessFehler;
import de.gassi.repository.AufgabeRepository;
import de.gassi.repository.BereichRepository;
import de.gassi.repository.SollRepository;
import de.gassi.repository.TeammitgliedRepository;
import de.gassi.repository.ZuteilungRepository;
import de.gassi.repository.ZeitfensterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PlanService {

    private final BereichRepository bereichRepository;
    private final ZeitfensterRepository zeitfensterRepository;
    private final AufgabeRepository aufgabeRepository;
    private final ZuteilungRepository zuteilungRepository;
    private final SollRepository sollRepository;
    private final TeammitgliedRepository teammitgliedRepository;
    private final TeamZugriffsPruefer zugriffsPruefer;
    private final ZeitService zeitService;

    @Transactional(readOnly = true)
    public PlanDto wochenplan(Long teamId, Long bereichId, int isoJahr, int isoWoche) {
        zugriffsPruefer.pruefeZugriff(teamId);

        Bereich bereich = bereichRepository.findById(bereichId)
            .filter(b -> b.getTeam() != null && b.getTeam().getId().equals(teamId))
            .orElseThrow(() -> new BusinessFehler("BEREICH_UNBEKANNT", "Dieser Bereich existiert nicht."));

        List<LocalDate> tage = zeitService.tageDerWoche(isoJahr, isoWoche);
        LocalDate von = tage.get(0);
        LocalDate bis = tage.get(6);

        List<Zeitfenster> zeitfenster = zeitfensterRepository
            .findByBereichIdAndAktivTrueOrderByPositionAsc(bereichId);
        List<Aufgabe> aufgaben = zeitfenster.isEmpty()
            ? List.of()
            : aufgabeRepository.findByZeitfensterInAndAktivTrueOrderByZeitfensterPositionAscPositionAsc(zeitfenster);
        List<Zuteilung> zuteilungen =
            zuteilungRepository.findImBereichImZeitraum(bereichId, von, bis);

        Map<Long, Map<LocalDate, Zuteilung>> nachAufgabe = new HashMap<>();
        Map<Long, Long> istProMitglied = new HashMap<>();
        for (Zuteilung z : zuteilungen) {
            nachAufgabe.computeIfAbsent(z.getAufgabe().getId(), k -> new HashMap<>())
                .put(z.getDatum(), z);
            istProMitglied.merge(z.getMitglied().getId(), 1L, Long::sum);
        }

        Map<Long, List<Aufgabe>> aufgabenNachZeitfenster = new HashMap<>();
        for (Aufgabe a : aufgaben) {
            aufgabenNachZeitfenster.computeIfAbsent(a.getZeitfenster().getId(), k -> new ArrayList<>())
                .add(a);
        }

        List<PlanDto.ZeitfensterGruppe> gruppen = new ArrayList<>();
        for (Zeitfenster zf : zeitfenster) {
            List<PlanDto.AufgabeZeile> zeilen = new ArrayList<>();
            for (Aufgabe aufgabe : aufgabenNachZeitfenster.getOrDefault(zf.getId(), List.of())) {
                Map<LocalDate, Zuteilung> nachTag = nachAufgabe.getOrDefault(aufgabe.getId(), Map.of());
                List<ZuteilungDto> boxen = tage.stream()
                    .map(tag -> {
                        Zuteilung z = nachTag.get(tag);
                        if (z == null) {
                            return new ZuteilungDto(null, aufgabe.getId(), null, null, tag);
                        }
                        return new ZuteilungDto(z.getId(), aufgabe.getId(), z.getMitglied().getId(),
                            z.getMitglied().getAnzeigename(), z.getDatum());
                    })
                    .toList();
                zeilen.add(new PlanDto.AufgabeZeile(zuAufgabeDto(aufgabe), boxen));
            }
            gruppen.add(new PlanDto.ZeitfensterGruppe(zf.getId(), zf.getName(), zf.getPosition(), zeilen));
        }

        List<Teammitglied> mitglieder = teammitgliedRepository.findByTeamIdOrderByIdAsc(teamId).stream()
            .filter(Teammitglied::isAktiv)
            .toList();

        List<PlanDto.MitgliedPlanInfo> mitgliedInfos = mitglieder.stream()
            .map(m -> {
                int soll = sollRepository.findByBereichIdAndMitgliedId(bereichId, m.getId())
                    .map(s -> s.getWert())
                    .orElse(0);
                long ist = istProMitglied.getOrDefault(m.getId(), 0L);
                return new PlanDto.MitgliedPlanInfo(m.getId(), m.getAnzeigename(), m.getFarbe(), soll, ist,
                    ist < soll, AvatarService.avatarUrlFuer(teamId, m.getId(),
                        m.getAvatar() != null && m.getAvatar().length > 0));
            })
            .toList();

        return new PlanDto(teamId, isoJahr, isoWoche, bereich.getId(), bereich.getName(), tage,
            mitgliedInfos, gruppen);
    }

    private AufgabeDto zuAufgabeDto(Aufgabe aufgabe) {
        return new AufgabeDto(aufgabe.getId(), aufgabe.getZeitfenster().getId(), aufgabe.getName(),
            aufgabe.isAktiv(), aufgabe.getPosition());
    }
}
