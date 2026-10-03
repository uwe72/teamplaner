package de.gassi.service;

import de.gassi.domain.Bereich;
import de.gassi.domain.Team;
import de.gassi.domain.Teammitglied;
import de.gassi.dto.StatistikDto;
import de.gassi.exception.BusinessFehler;
import de.gassi.repository.AufgabeRepository;
import de.gassi.repository.BereichRepository;
import de.gassi.repository.TeamRepository;
import de.gassi.repository.TeammitgliedRepository;
import de.gassi.repository.ZuteilungRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StatistikService {

    private final BereichRepository bereichRepository;
    private final AufgabeRepository aufgabeRepository;
    private final ZuteilungRepository zuteilungRepository;
    private final TeammitgliedRepository teammitgliedRepository;
    private final TeamRepository teamRepository;
    private final TeamZugriffsPruefer zugriffsPruefer;
    private final ZeitService zeitService;

    @Transactional(readOnly = true)
    public StatistikDto statistik(Long teamId, Long bereichId, Integer isoJahr, Integer isoWoche,
                                  Integer monatJahr, Integer monat) {
        zugriffsPruefer.pruefeZugriff(teamId);
        if (monat != null && (monat < 1 || monat > 12)) {
            throw new BusinessFehler("MONAT_UNGUELTIG", "Ungültiger Monat.");
        }
        Bereich bereich = bereichRepository.findById(bereichId)
            .filter(b -> b.getTeam() != null && b.getTeam().getId().equals(teamId))
            .orElseThrow(() -> new BusinessFehler("BEREICH_UNBEKANNT", "Dieser Bereich existiert nicht."));
        Team team = bereich.getTeam();

        long aufkommenProWoche = 7L * aufgabeRepository.findByZeitfensterBereichIdAndAktivTrue(bereichId).size();

        List<Teammitglied> mitglieder = teammitgliedRepository.findByTeamIdOrderByIdAsc(teamId);

        LocalDate heute = zeitService.heute();
        LocalDate montagAktuell = montagDerWoche(heute);

        List<StatistikDto.StatistikZeile> wochenweise;
        if (isoJahr != null && isoWoche != null) {
            LocalDate montag = zeitService.montagVon(isoJahr, isoWoche);
            LocalDate sonntag = montag.plusDays(6);
            wochenweise = mitglieder.stream()
                .map(m -> {
                    long ist = zuteilungRepository.zaehleMitgliedImBereichImZeitraum(m.getId(), bereichId, montag, sonntag);
                    return zeile(m, ist, aufkommenProWoche);
                })
                .toList();
        } else {
            wochenweise = mitglieder.stream()
                .map(m -> new StatistikDto.StatistikZeile(m.getId(), m.getAnzeigename(),
                    m.isAktiv(), 0, aufkommenProWoche, 0.0))
                .toList();
        }

        LocalDate ersterMontag = montagDerWoche(team.getErstelltAm().toLocalDate());
        LocalDate letzterSonntag = montagAktuell.plusDays(6);
        List<StatistikDto.StatistikZeile> kumuliert = mitglieder.stream()
            .map(m -> {
                long ist = zuteilungRepository.zaehleMitgliedImBereichImZeitraum(m.getId(), bereichId, ersterMontag, letzterSonntag);
                long wochenAnzahl = zeitService.wochenZwischen(ersterMontag, montagAktuell) + 1;
                long moeglich = wochenAnzahl * aufkommenProWoche;
                return zeile(m, ist, moeglich);
            })
            .toList();

        LocalDate ersterMonatstag;
        LocalDate letzterMonatstag;
        long tageMassgeblich;
        java.time.YearMonth fokusMonat = monatJahr != null && monat != null
            ? java.time.YearMonth.of(monatJahr, monat)
            : java.time.YearMonth.from(heute);
        ersterMonatstag = fokusMonat.atDay(1);
        letzterMonatstag = fokusMonat.atEndOfMonth();
        tageMassgeblich = fokusMonat.equals(java.time.YearMonth.from(heute))
            ? heute.getDayOfMonth()
            : fokusMonat.lengthOfMonth();
        long aufkommenProTag = Math.round(aufkommenProWoche / 7.0);
        List<StatistikDto.StatistikZeile> monatlich = mitglieder.stream()
            .map(m -> {
                long ist = zuteilungRepository.zaehleMitgliedImBereichImZeitraum(m.getId(), bereichId, ersterMonatstag, letzterMonatstag);
                long moeglich = tageMassgeblich * aufkommenProTag;
                return zeile(m, ist, moeglich);
            })
            .toList();

        return new StatistikDto(bereich.getId(), bereich.getName(), wochenweise, monatlich, kumuliert);
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
