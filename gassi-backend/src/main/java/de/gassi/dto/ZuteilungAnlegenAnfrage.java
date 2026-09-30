package de.gassi.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ZuteilungAnlegenAnfrage(
    @NotNull Long aufgabeId,
    @NotNull LocalDate datum,
    @NotNull Long mitgliedId
) {
}
