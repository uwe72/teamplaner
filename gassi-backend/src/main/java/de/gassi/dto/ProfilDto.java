package de.gassi.dto;

public record ProfilDto(
    Long id,
    String login,
    String email,
    String anzeigename,
    String farbe,
    String rolle,
    Long teamId,
    String teamName
) {
}
