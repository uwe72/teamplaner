package de.gassi.dto;

import jakarta.validation.constraints.NotBlank;

public record ProfilAendernAnfrage(
    @NotBlank String anzeigename
) {
}
