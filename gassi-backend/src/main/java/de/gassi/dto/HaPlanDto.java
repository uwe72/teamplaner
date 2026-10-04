package de.gassi.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record HaPlanDto(
    String team,
    String bereich,
    int kw,
    LocalDate von,
    LocalDate bis,
    OffsetDateTime stand,
    List<String> slots,
    List<Person> personen,
    List<Tag> tage,
    int offen,
    Statistik statistik
) {

    public record Person(
        String kuerzel,
        String name,
        String foto,
        int ist,
        int soll
    ) {
    }

    public record Statistik(
        Block gesamt,
        Block monat
    ) {
    }

    public record Block(
        String titel,
        long summe,
        List<StatistikPerson> personen
    ) {
    }

    public record StatistikPerson(
        String kuerzel,
        long anzahl,
        double prozent
    ) {
    }

    public record Tag(
        LocalDate datum,
        String tag,
        boolean heute,
        List<Runde> runden
    ) {
    }

    public record Runde(
        String slot,
        List<String> personen,
        boolean frei
    ) {
    }
}
