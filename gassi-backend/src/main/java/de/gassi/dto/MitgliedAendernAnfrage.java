package de.gassi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record MitgliedAendernAnfrage(
    @NotBlank String anzeigename,
    @NotBlank @Email String email,
    @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String farbe,
    String rolle,
    Boolean aktiv,
    String passwort
) {
}
