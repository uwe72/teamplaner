package de.gassi.dto;

public record BereichAendernAnfrage(
    String name,
    Boolean aktiv,
    Integer position
) {
}
