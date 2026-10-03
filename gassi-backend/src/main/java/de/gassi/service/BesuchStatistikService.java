package de.gassi.service;

import de.gassi.domain.BesuchGranularitaet;
import de.gassi.domain.Teammitglied;
import de.gassi.dto.BesuchBucketDto;
import de.gassi.dto.BesuchMitgliedDto;
import de.gassi.dto.BesuchMonatDto;
import de.gassi.dto.BesuchStatistikDto;
import de.gassi.dto.BesuchTeamDto;
import de.gassi.dto.BesuchZeitverlaufDto;
import de.gassi.repository.BesuchLogRepository;
import de.gassi.repository.TeammitgliedRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BesuchStatistikService {

    private static final Logger log = LoggerFactory.getLogger(BesuchStatistikService.class);

    private final BesuchLogRepository besuchLogRepository;
    private final TeammitgliedRepository teammitgliedRepository;
    private final ZeitService zeitService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void besuchErfassen(Teammitglied mitglied) {
        try {
            int eingefuegt = besuchLogRepository.insertBesuchIfAbsent(mitglied.getId(), zeitService.heute());
            if (eingefuegt > 0) {
                mitglied.setBesuchAnzahl(mitglied.getBesuchAnzahl() == null ? 1 : mitglied.getBesuchAnzahl() + 1);
                teammitgliedRepository.save(mitglied);
            }
        } catch (Exception e) {
            log.warn("Besuch konnte nicht erfasst werden für mitglied={}", mitglied.getLogin(), e);
        }
    }

    @Transactional(readOnly = true)
    public BesuchStatistikDto statistik(Long teamId, LocalDate von, LocalDate bis) {
        return monatStatistik(besuchLogRepository.zaehleBesucheNachMonatUndMitglied(teamId, von, bis), von, bis);
    }

    @Transactional(readOnly = true)
    public BesuchStatistikDto statistikAlleTeams(LocalDate von, LocalDate bis) {
        return monatStatistik(besuchLogRepository.zaehleBesucheNachMonatUndMitgliedAlleTeams(von, bis), von, bis);
    }

    @Transactional(readOnly = true)
    public List<BesuchTeamDto> besucheJeTeam(LocalDate von, LocalDate bis) {
        List<BesuchTeamDto> teams = new ArrayList<>();
        for (Object[] zeile : besuchLogRepository.zaehleBesucheNachTeam(von, bis)) {
            teams.add(new BesuchTeamDto(((Number) zeile[0]).longValue(), (String) zeile[1],
                ((Number) zeile[2]).longValue(), ((Number) zeile[3]).longValue()));
        }
        return teams.stream()
            .sorted(Comparator.comparingLong(BesuchTeamDto::besuche).reversed()
                .thenComparing(BesuchTeamDto::teamName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
            .toList();
    }

    @Transactional(readOnly = true)
    public BesuchZeitverlaufDto zeitverlauf(Long teamId, BesuchGranularitaet granularitaet) {
        Zeitbereich bereich = zeitbereich(granularitaet, zeitService.heute());
        return zeitverlaufStatistik(
            besuchLogRepository.zaehleBesucheNachPeriode(postgresEinheit(granularitaet), teamId,
                bereich.von(), bereich.bis()),
            bereich.von(), bereich.bis(),
            granularitaet, teammitgliedRepository.countByTeamIdAndAktivTrue(teamId));
    }

    @Transactional(readOnly = true)
    public BesuchZeitverlaufDto zeitverlaufAlleTeams(BesuchGranularitaet granularitaet) {
        Zeitbereich bereich = zeitbereich(granularitaet, zeitService.heute());
        return zeitverlaufStatistik(
            besuchLogRepository.zaehleBesucheNachPeriodeAlleTeams(postgresEinheit(granularitaet),
                bereich.von(), bereich.bis()),
            bereich.von(), bereich.bis(),
            granularitaet, teammitgliedRepository.countByAktivTrueAndTeamIsNotNull());
    }

    private BesuchStatistikDto monatStatistik(List<Object[]> zeilen, LocalDate von, LocalDate bis) {
        Map<YearMonth, Map<Long, Long>> zaehler = new LinkedHashMap<>();
        Map<Long, Object[]> namen = new HashMap<>();
        for (Object[] zeile : zeilen) {
            YearMonth monat = YearMonth.of(((Number) zeile[0]).intValue(), ((Number) zeile[1]).intValue());
            Long mitgliedId = ((Number) zeile[2]).longValue();
            namen.putIfAbsent(mitgliedId, new Object[]{(String) zeile[3], (String) zeile[4], (String) zeile[5]});
            zaehler.computeIfAbsent(monat, k -> new LinkedHashMap<>())
                .merge(mitgliedId, ((Number) zeile[6]).longValue(), Long::sum);
        }

        List<BesuchMonatDto> monate = new ArrayList<>();
        YearMonth zeiger = YearMonth.from(von);
        YearMonth ende = YearMonth.from(bis.minusDays(1));
        while (!zeiger.isAfter(ende)) {
            List<BesuchMitgliedDto> mitglieder = zaehler.getOrDefault(zeiger, Map.of()).entrySet().stream()
                .map(e -> {
                    Object[] n = namen.get(e.getKey());
                    return new BesuchMitgliedDto(e.getKey(), (String) n[0], (String) n[1], (String) n[2], e.getValue());
                })
                .sorted(Comparator.comparingLong(BesuchMitgliedDto::besuche).reversed()
                    .thenComparing(BesuchMitgliedDto::login))
                .toList();
            monate.add(new BesuchMonatDto(zeiger.getYear(), zeiger.getMonthValue(),
                mitglieder.stream().mapToLong(BesuchMitgliedDto::besuche).sum(), mitglieder));
            zeiger = zeiger.plusMonths(1);
        }
        return new BesuchStatistikDto(monate);
    }

    private BesuchZeitverlaufDto zeitverlaufStatistik(List<Object[]> zeilen, LocalDate von, LocalDate bis,
                                                      BesuchGranularitaet granularitaet, long gesamtMitglieder) {
        Map<LocalDate, long[]> nachPeriode = new HashMap<>();
        for (Object[] zeile : zeilen) {
            nachPeriode.put(lokalesDatum(zeile[0]), new long[]{
                ((Number) zeile[1]).longValue(), ((Number) zeile[2]).longValue()});
        }

        List<BesuchBucketDto> buckets = new ArrayList<>();
        LocalDate zeiger = von;
        while (zeiger.isBefore(bis)) {
            long[] werte = nachPeriode.getOrDefault(zeiger, new long[]{0L, 0L});
            buckets.add(new BesuchBucketDto(zeiger, werte[0], werte[1]));
            zeiger = switch (granularitaet) {
                case TAG -> zeiger.plusDays(1);
                case WOCHE -> zeiger.plusWeeks(1);
                case MONAT -> zeiger.plusMonths(1);
                case QUARTAL -> zeiger.plusMonths(3);
                case JAHR -> zeiger.plusYears(1);
            };
        }

        return new BesuchZeitverlaufDto(granularitaet.name(), gesamtMitglieder, buckets);
    }

    private record Zeitbereich(LocalDate von, LocalDate bis) {
    }

    private Zeitbereich zeitbereich(BesuchGranularitaet granularitaet, LocalDate heute) {
        LocalDate aktuellerStart = switch (granularitaet) {
            case TAG -> heute;
            case WOCHE -> heute.with(DayOfWeek.MONDAY);
            case MONAT -> heute.withDayOfMonth(1);
            case QUARTAL -> heute.withMonth(((heute.getMonthValue() - 1) / 3) * 3 + 1).withDayOfMonth(1);
            case JAHR -> heute.withDayOfYear(1);
        };
        LocalDate von = switch (granularitaet) {
            case TAG -> aktuellerStart.minusDays(59);
            case WOCHE -> aktuellerStart.minusWeeks(25);
            case MONAT -> aktuellerStart.minusMonths(23);
            case QUARTAL -> aktuellerStart.minusMonths(21);
            case JAHR -> aktuellerStart.minusYears(4);
        };
        LocalDate bis = switch (granularitaet) {
            case TAG -> aktuellerStart.plusDays(1);
            case WOCHE -> aktuellerStart.plusWeeks(1);
            case MONAT -> aktuellerStart.plusMonths(1);
            case QUARTAL -> aktuellerStart.plusMonths(3);
            case JAHR -> aktuellerStart.plusYears(1);
        };
        return new Zeitbereich(von, bis);
    }

    private String postgresEinheit(BesuchGranularitaet granularitaet) {
        return switch (granularitaet) {
            case TAG -> "day";
            case WOCHE -> "week";
            case MONAT -> "month";
            case QUARTAL -> "quarter";
            case JAHR -> "year";
        };
    }

    private LocalDate lokalesDatum(Object wert) {
        if (wert instanceof LocalDate datum) {
            return datum;
        }
        if (wert instanceof java.sql.Date datum) {
            return datum.toLocalDate();
        }
        if (wert instanceof java.sql.Timestamp zeitstempel) {
            return zeitstempel.toLocalDateTime().toLocalDate();
        }
        throw new IllegalStateException("Unerwarteter Typ für Periodenstart: " + wert.getClass());
    }
}
