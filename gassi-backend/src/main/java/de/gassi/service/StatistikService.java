package de.gassi.service;

import de.gassi.domain.Bereich;
import de.gassi.domain.Soll;
import de.gassi.domain.Team;
import de.gassi.domain.Teammitglied;
import de.gassi.dto.StatistikDto;
import de.gassi.exception.BusinessFehler;
import de.gassi.repository.AufgabeRepository;
import de.gassi.repository.BereichRepository;
import de.gassi.repository.SollRepository;
import de.gassi.repository.TeamRepository;
import de.gassi.repository.TeammitgliedRepository;
import de.gassi.repository.ZuteilungRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StatistikService {

    private final BereichRepository bereichRepository;
    private final AufgabeRepository aufgabeRepository;
    private final ZuteilungRepository zuteilungRepository;
    private final TeammitgliedRepository teammitgliedRepository;
    private final SollRepository sollRepository;
    private final TeamRepository teamRepository;
    private final TeamZugriffsPruefer zugriffsPruefer;
    private final ZeitService zeitService;

    @Transactional(readOnly = true)
    public StatistikDto statistik(Long teamId, Long bereichId, Integer isoJahr, Integer isoWoche) {
        zugriffsPruefer.pruefeZugriff(teamId);
        return statistikOhneZugriffspruefung(teamId, bereichId, isoJahr, isoWoche);
    }

    @Transactional(readOnly = true)
    public StatistikDto statistikOhneZugriffspruefung(Long teamId, Long bereichId, Integer isoJahr, Integer isoWoche) {
        Bereich bereich = bereichRepository.findById(bereichId)
            .filter(b -> b.getTeam() != null && b.getTeam().getId().equals(teamId))
            .orElseThrow(() -> new BusinessFehler("BEREICH_UNBEKANNT", "Dieser Bereich existiert nicht."));
        Team team = bereich.getTeam();

        long aufkommenProWoche = 7L * aufgabeRepository.findByZeitfensterBereichIdAndAktivTrue(bereichId).size();

        List<Teammitglied> mitglieder = teammitgliedRepository.findByTeamIdOrderByIdAsc(teamId);
        Map<Long, Integer> solls = sollProMitglied(bereichId);

        LocalDate heute = zeitService.heute();
        LocalDate montagAktuell = montagDerWoche(heute);
        LocalDate gestern = heute.minusDays(1);

        List<StatistikDto.StatistikZeile> wochenweise;
        if (isoJahr != null && isoWoche != null) {
            LocalDate montag = zeitService.montagVon(isoJahr, isoWoche);
            LocalDate sonntag = montag.plusDays(6);
            LocalDate zaehlBis = sonntag.isBefore(gestern) ? sonntag : gestern;
            wochenweise = mitglieder.stream()
                .map(m -> {
                    long ist = zaehlBis.isBefore(montag) ? 0
                        : zuteilungRepository.zaehleMitgliedImBereichImZeitraum(m.getId(), bereichId, montag, zaehlBis);
                    return zeile(m, ist, solls.getOrDefault(m.getId(), 0));
                })
                .toList();
        } else {
            wochenweise = mitglieder.stream()
                .map(m -> new StatistikDto.StatistikZeile(m.getId(), m.getAnzeigename(),
                    m.isAktiv(), 0, solls.getOrDefault(m.getId(), 0), 0.0))
                .toList();
        }

        LocalDate ersterMontag = montagDerWoche(team.getErstelltAm().toLocalDate());
        LocalDate letzterSonntag = montagAktuell.plusDays(6);
        long abgelaufeneTageAktuelleWoche = gestern.isBefore(montagAktuell)
            ? 0
            : java.time.temporal.ChronoUnit.DAYS.between(montagAktuell, gestern) + 1;
        long wochenAnzahl = zeitService.wochenZwischen(ersterMontag, montagAktuell);
        List<StatistikDto.StatistikZeile> kumuliert = mitglieder.stream()
            .map(m -> {
                LocalDate zaehlBis = letzterSonntag.isBefore(gestern) ? letzterSonntag : gestern;
                long ist = zaehlBis.isBefore(ersterMontag) ? 0
                    : zuteilungRepository.zaehleMitgliedImBereichImZeitraum(m.getId(), bereichId, ersterMontag, zaehlBis);
                long moeglich = wochenAnzahl * aufkommenProWoche + abgelaufeneTageAktuelleWoche * Math.round(aufkommenProWoche / 7.0);
                return zeile(m, ist, moeglich);
            })
            .toList();

        List<StatistikDto.StatistikZeile> zielerreichung = mitglieder.stream()
            .filter(m -> solls.getOrDefault(m.getId(), 0) > 0)
            .map(m -> {
                LocalDate zaehlBis = letzterSonntag.isBefore(gestern) ? letzterSonntag : gestern;
                long ist = zaehlBis.isBefore(ersterMontag) ? 0
                    : zuteilungRepository.zaehleMitgliedImBereichImZeitraum(m.getId(), bereichId, ersterMontag, zaehlBis);
                long wochenMitIst = abgelaufeneTageAktuelleWoche > 0 ? wochenAnzahl + 1 : wochenAnzahl;
                long moeglich = wochenMitIst * solls.getOrDefault(m.getId(), 0);
                return zeile(m, ist, moeglich);
            })
            .toList();

        return new StatistikDto(bereich.getId(), bereich.getName(), wochenweise, kumuliert, zielerreichung);
    }

    private Map<Long, Integer> sollProMitglied(Long bereichId) {
        Map<Long, Integer> solls = new HashMap<>();
        for (Soll soll : sollRepository.findByBereichIdOrderByMitgliedAnzeigenameAsc(bereichId)) {
            solls.put(soll.getMitglied().getId(), soll.getWert());
        }
        return solls;
    }

    private LocalDate montagDerWoche(LocalDate datum) {
        return datum.with(java.time.DayOfWeek.MONDAY);
    }

    private StatistikDto.StatistikZeile zeile(Teammitglied m, long ist, long moeglich) {
        double prozent = moeglich <= 0 ? 0.0 : Math.round((100.0 * ist / moeglich) * 10.0) / 10.0;
        return new StatistikDto.StatistikZeile(m.getId(), m.getAnzeigename(), m.isAktiv(),
            ist, moeglich, prozent);
    }
}
