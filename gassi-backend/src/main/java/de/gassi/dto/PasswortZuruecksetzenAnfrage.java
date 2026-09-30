package de.gassi.dto;

import jakarta.validation.constraints.NotBlank;

public record PasswortZuruecksetzenAnfrage(
    @NotBlank String token,
    @NotBlank String neuesPasswort
) {
}
