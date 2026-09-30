package de.gassi.dto;

public record AufgabeAendernAnfrage(
    String name,
    Boolean aktiv,
    Integer position
) {
}
