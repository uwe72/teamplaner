package de.gassi.dto;

public record AufgabeDto(
    Long id,
    Long zeitfensterId,
    String name,
    boolean aktiv,
    int position
) {
}
