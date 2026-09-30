package de.gassi.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ZeitfensterZuteilungAnlegenAnfrage(
    @NotNull LocalDate datum,
    @NotNull Long mitgliedId
) {
}
