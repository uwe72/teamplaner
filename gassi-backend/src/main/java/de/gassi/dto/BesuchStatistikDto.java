package de.gassi.dto;

import java.util.List;

public record BesuchStatistikDto(
    List<BesuchMonatDto> monate
) {
}
