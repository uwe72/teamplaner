package de.gassi.dto;

import java.util.List;

public record StatistikDto(
    Long bereichId,
    String bereichName,
    List<StatistikZeile> wochenweise,
    List<StatistikZeile> kumuliert
) {

    public record StatistikZeile(
        Long mitgliedId,
        String anzeigename,
        String farbe,
        boolean aktiv,
        long ist,
        long moeglich,
        double prozent
    ) {
    }
}
