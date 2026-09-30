package de.gassi.dto;

import jakarta.validation.constraints.NotBlank;

public record PasswortAendernAnfrage(
    @NotBlank String altesPasswort,
    @NotBlank String neuesPasswort
) {
}
