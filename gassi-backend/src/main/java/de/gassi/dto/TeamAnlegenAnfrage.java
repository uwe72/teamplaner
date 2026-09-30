package de.gassi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TeamAnlegenAnfrage(
    @NotBlank @Size(max = 50) String teamName
) {
}
