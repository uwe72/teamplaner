package de.gassi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record MitgliedAendernAnfrage(
    @NotBlank String anzeigename,
    @NotBlank @Email String email,
    String rolle,
    Boolean aktiv,
    String passwort
) {
}
