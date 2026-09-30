package de.gassi.dto;

public record PasswortVergessenAntwortDto(
    boolean mehrereKonten,
    java.util.List<String> logins
) {
}
