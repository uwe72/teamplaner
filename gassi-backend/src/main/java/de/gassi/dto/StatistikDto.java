package de.gassi.dto;

import java.util.List;

public record StatistikDto(
    Long bereichId,
    String bereichName,
    List<StatistikZeile> wochenweise,
    List<StatistikZeile> kumuliert,
    List<StatistikZeile> zielerreichung
) {

    public record StatistikZeile(
        Long mitgliedId,
        String anzeigename,
        boolean aktiv,
        long ist,
        long moeglich,
        double prozent
    ) {
    }
}
