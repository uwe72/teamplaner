package de.gassi.dto;

public record AuthAntwort(
    String token,
    String refreshToken,
    Long id,
    String login,
    String anzeigename,
    String rolle,
    Long teamId,
    String teamName,
    boolean teamOeffen,
    String avatarUrl
) {
}
