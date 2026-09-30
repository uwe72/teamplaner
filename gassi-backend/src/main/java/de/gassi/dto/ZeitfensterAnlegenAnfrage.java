package de.gassi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ZeitfensterAnlegenAnfrage(
    @NotBlank @Size(max = 100) String name
) {
}
