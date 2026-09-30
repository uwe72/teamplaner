package de.gassi.service;

import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.List;

@Service
public class ZeitService {

    public static final ZoneId ZONE = ZoneId.of("Europe/Berlin");

    public LocalDate heute() {
        return LocalDate.now(ZONE);
    }

    public LocalDateTime jetzt() {
        return LocalDateTime.now(ZONE);
    }

    public int isoJahr(LocalDate datum) {
        return datum.get(WeekFields.ISO.weekBasedYear());
    }

    public int isoWoche(LocalDate datum) {
        return datum.get(WeekFields.ISO.weekOfWeekBasedYear());
    }

    public LocalDate montagVon(int isoJahr, int isoWoche) {
        LocalDate heute = heute();
        LocalDate montagHeute = heute.with(DayOfWeek.MONDAY);
        int jahrHeute = isoJahr(montagHeute);
        int wocheHeute = isoWoche(montagHeute);
        int wocheVerschiebung = (isoJahr - jahrHeute) * 52 + (isoWoche - wocheHeute);
        return montagHeute.plusWeeks(wocheVerschiebung);
    }

    public List<LocalDate> tageDerWoche(int isoJahr, int isoWoche) {
        LocalDate montag = montagVon(isoJahr, isoWoche);
        List<LocalDate> tage = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            tage.add(montag.plusDays(i));
        }
        return tage;
    }

    public LocalDate sonntagVon(int isoJahr, int isoWoche) {
        return montagVon(isoJahr, isoWoche).plusDays(6);
    }

    public long wochenZwischen(LocalDate vonMontag, LocalDate bisMontag) {
        return ChronoUnit.WEEKS.between(vonMontag, bisMontag);
    }
}
