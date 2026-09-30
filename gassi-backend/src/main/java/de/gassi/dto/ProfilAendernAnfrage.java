package de.gassi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ProfilAendernAnfrage(
    @NotBlank String anzeigename,
    @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String farbe
) {
}
