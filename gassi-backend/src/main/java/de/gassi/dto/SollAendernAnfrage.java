package de.gassi.dto;

import jakarta.validation.constraints.NotNull;

public record SollAendernAnfrage(
    @NotNull Long mitgliedId,
    @NotNull Integer wert
) {
}
