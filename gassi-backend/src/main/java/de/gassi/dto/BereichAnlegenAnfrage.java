package de.gassi.dto;

import jakarta.validation.constraints.NotBlank;

public record BereichAnlegenAnfrage(
    @NotBlank String name
) {
}
