package de.gassi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AufgabeAnlegenAnfrage(
    @NotBlank @Size(max = 100) String name
) {
}
