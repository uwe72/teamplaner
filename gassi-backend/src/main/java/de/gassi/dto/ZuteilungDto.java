package de.gassi.dto;

import java.time.LocalDate;

public record ZuteilungDto(
    Long id,
    Long aufgabeId,
    Long mitgliedId,
    String anzeigename,
    LocalDate datum
) {
}
