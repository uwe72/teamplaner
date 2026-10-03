package de.gassi.controller;

import de.gassi.domain.BesuchGranularitaet;
import de.gassi.domain.Rolle;
import de.gassi.domain.Teammitglied;
import de.gassi.dto.BesuchStatistikDto;
import de.gassi.dto.BesuchZeitverlaufDto;
import de.gassi.exception.BusinessFehler;
import de.gassi.service.BesuchStatistikService;
import de.gassi.service.TeamZugriffsPruefer;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/teams/{teamId}")
@RequiredArgsConstructor
public class BesuchController {

    private final TeamZugriffsPruefer zugriffsPruefer;
    private final BesuchStatistikService besuchStatistikService;

    @PostMapping("/besuche")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void besuchErfassen(@PathVariable Long teamId) {
        Teammitglied nutzer = zugriffsPruefer.pruefeZugriff(teamId);
        if (nutzer.getRolle() == Rolle.SUPER_ADMIN) {
            return;
        }
        if (nutzer.getTeam() == null || !nutzer.getTeam().getId().equals(teamId)) {
            return;
        }
        besuchStatistikService.besuchErfassen(nutzer);
    }

    @GetMapping("/statistik/besuche")
    public BesuchStatistikDto besuchStatistik(@PathVariable Long teamId,
                                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate von,
                                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate bis) {
        zugriffsPruefer.pruefeAdminZugriff(teamId);
        if (!bis.isAfter(von)) {
            throw new BusinessFehler("ZEITRAUM_UNGUELTIG", "Das Enddatum muss nach dem Startdatum liegen.");
        }
        return besuchStatistikService.statistik(teamId, von, bis);
    }

    @GetMapping("/statistik/besuche/zeitverlauf")
    public BesuchZeitverlaufDto zeitverlauf(@PathVariable Long teamId,
                                            @RequestParam String granularitaet) {
        zugriffsPruefer.pruefeAdminZugriff(teamId);
        BesuchGranularitaet g;
        try {
            g = BesuchGranularitaet.valueOf(granularitaet);
        } catch (IllegalArgumentException e) {
            throw new BusinessFehler("GRANULARITAET_UNGUELTIG", "Unbekannte Granularität.");
        }
        return besuchStatistikService.zeitverlauf(teamId, g);
    }
}
