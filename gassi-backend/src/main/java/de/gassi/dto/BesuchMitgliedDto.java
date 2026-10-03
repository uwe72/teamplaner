package de.gassi.dto;

public record BesuchMitgliedDto(
    Long mitgliedId,
    String login,
    String anzeigename,
    String teamName,
    long besuche
) {
}
