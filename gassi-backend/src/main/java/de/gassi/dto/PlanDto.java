package de.gassi.dto;

import java.time.LocalDate;
import java.util.List;

public record PlanDto(
    Long teamId,
    int isoJahr,
    int isoWoche,
    Long bereichId,
    String bereichName,
    List<LocalDate> tage,
    List<MitgliedPlanInfo> mitglieder,
    List<ZeitfensterGruppe> gruppen
) {

    public record MitgliedPlanInfo(
        Long id,
        String anzeigename,
        String farbe,
        int soll,
        long ist,
        boolean sollUnterschritten,
        String avatarUrl
    ) {
    }

    public record ZeitfensterGruppe(
        Long zeitfensterId,
        String zeitfensterName,
        int position,
        List<AufgabeZeile> zeilen
    ) {
    }

    public record AufgabeZeile(
        AufgabeDto aufgabe,
        List<ZuteilungDto> zuteilungen
    ) {
    }
}
