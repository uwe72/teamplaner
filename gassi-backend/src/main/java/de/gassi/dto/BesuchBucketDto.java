package de.gassi.dto;

import java.time.LocalDate;

public record BesuchBucketDto(
    LocalDate periodenStart,
    long besuche,
    long verschiedeneMitglieder
) {
}
