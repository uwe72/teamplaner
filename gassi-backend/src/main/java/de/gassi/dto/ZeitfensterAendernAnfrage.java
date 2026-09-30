package de.gassi.dto;

public record ZeitfensterAendernAnfrage(
    String name,
    Boolean aktiv,
    Integer position
) {
}
