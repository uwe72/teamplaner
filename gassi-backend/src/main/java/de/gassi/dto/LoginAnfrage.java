package de.gassi.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginAnfrage(
    @NotBlank String login,
    @NotBlank String passwort
) {
}
