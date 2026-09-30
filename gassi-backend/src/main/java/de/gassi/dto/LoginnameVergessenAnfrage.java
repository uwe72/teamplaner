package de.gassi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginnameVergessenAnfrage(
    @NotBlank @Email String email
) {
}
