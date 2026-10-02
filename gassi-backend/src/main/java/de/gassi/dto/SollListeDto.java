package de.gassi.dto;

import java.util.List;

public record SollListeDto(
    Long bereichId,
    long aufkommenProWoche,
    int sollSumme,
    boolean summenwarnung,
    List<SollEintrag> eintraege
) {

    public record SollEintrag(
        Long mitgliedId,
        String anzeigename,
        boolean aktiv,
        int wert
    ) {
    }
}
