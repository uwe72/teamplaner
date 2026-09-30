package de.gassi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record PasswortVergessenAnfrage(
    @NotBlank @Email String email,
    String login
) {
}
