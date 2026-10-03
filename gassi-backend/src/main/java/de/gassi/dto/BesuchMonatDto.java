package de.gassi.dto;

import java.util.List;

public record BesuchMonatDto(
    int jahr,
    int monat,
    long besucheGesamt,
    List<BesuchMitgliedDto> mitglieder
) {
}
