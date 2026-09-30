package de.gassi.dto;

import java.util.Map;

public record SystemConfigDto(
    Map<String, String> werte
) {
}
