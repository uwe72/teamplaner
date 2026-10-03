package de.gassi.dto;

import java.util.List;

public record BesuchZeitverlaufDto(
    String granularitaet,
    long gesamtMitglieder,
    List<BesuchBucketDto> bucketListe
) {
}
