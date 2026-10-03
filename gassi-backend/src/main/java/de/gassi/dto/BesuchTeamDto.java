package de.gassi.dto;

public record BesuchTeamDto(
    Long teamId,
    String teamName,
    long besuche,
    long verschiedeneMitglieder
) {
}
