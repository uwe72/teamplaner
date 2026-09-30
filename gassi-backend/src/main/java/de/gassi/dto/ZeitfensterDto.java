package de.gassi.dto;

public record ZeitfensterDto(
    Long id,
    Long bereichId,
    String name,
    boolean aktiv,
    int position
) {
}
