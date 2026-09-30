package de.gassi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record MitgliedAnlegenAnfrage(
    @NotBlank @Size(max = 25) String login,
    @NotBlank @Email String email,
    @NotBlank String passwort,
    @NotBlank String anzeigename,
    @NotBlank @Pattern(regexp = "^#[0-9a-fA-F]{6}$") String farbe,
    String rolle
) {
}
