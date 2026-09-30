package de.gassi.dto;

public record BereichDto(
    Long id,
    String name,
    boolean aktiv,
    int position
) {
}
