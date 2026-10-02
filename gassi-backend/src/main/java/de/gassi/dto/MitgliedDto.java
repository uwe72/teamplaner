package de.gassi.dto;

public record MitgliedDto(
    Long id,
    String login,
    String email,
    String anzeigename,
    String rolle,
    boolean aktiv,
    Long teamId,
    String teamName,
    String avatarUrl
) {
}
