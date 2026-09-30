package de.gassi.dto;

public record TeamDto(
    Long id,
    String name,
    boolean aktiv,
    String erstelltAm,
    long mitgliederAnzahl
) {
}
