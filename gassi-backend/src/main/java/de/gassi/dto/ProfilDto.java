package de.gassi.dto;

public record ProfilDto(
    Long id,
    String login,
    String email,
    String anzeigename,
    String rolle,
    Long teamId,
    String teamName,
    String avatarUrl
) {
}
