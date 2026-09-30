package de.gassi.controller;

import de.gassi.domain.Rolle;
import de.gassi.dto.SystemConfigDto;
import de.gassi.dto.TeamAendernAnfrage;
import de.gassi.dto.TeamDto;
import de.gassi.exception.BusinessFehler;
import de.gassi.repository.TeammitgliedRepository;
import de.gassi.service.KonfigurationsService;
import de.gassi.service.ZeitService;
import de.gassi.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/super")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SuperController {

    private final TeamRepository teamRepository;
    private final TeammitgliedRepository teammitgliedRepository;
    private final KonfigurationsService konfigurationsService;

    @GetMapping("/teams")
    public List<TeamDto> teams() {
        return teamRepository.findAll().stream()
            .sorted(java.util.Comparator.comparing(de.gassi.domain.Team::getName, String.CASE_INSENSITIVE_ORDER))
            .map(t -> new TeamDto(t.getId(), t.getName(), t.isAktiv(),
                t.getErstelltAm().toString(),
                teammitgliedRepository.findByTeamIdOrderByIdAsc(t.getId()).size()))
            .toList();
    }

    @PutMapping("/teams/{id}")
    public TeamDto teamAendern(@PathVariable Long id, @RequestBody TeamAendernAnfrage anfrage) {
        de.gassi.domain.Team team = teamRepository.findById(id)
            .orElseThrow(() -> new BusinessFehler("TEAM_UNBEKANNT", "Dieses Team existiert nicht."));
        if (anfrage.name() != null && !anfrage.name().isBlank()) {
            String name = anfrage.name().trim();
            teamRepository.findByNameIgnoreCase(name)
                .filter(t -> !t.getId().equals(id))
                .ifPresent(t -> {
                    throw new BusinessFehler("TEAMNAME_BELEGT", "Dieser Teamname ist bereits vergeben.");
                });
            team.setName(name);
        }
        if (anfrage.aktiv() != null) {
            team.setAktiv(anfrage.aktiv());
        }
        team = teamRepository.save(team);
        return new TeamDto(team.getId(), team.getName(), team.isAktiv(), team.getErstelltAm().toString(),
            teammitgliedRepository.findByTeamIdOrderByIdAsc(team.getId()).size());
    }

    @GetMapping("/config")
    public SystemConfigDto config() {
        return new SystemConfigDto(konfigurationsService.alle());
    }

    @PutMapping("/config")
    public SystemConfigDto configSetzen(@RequestBody SystemConfigDto dto) {
        konfigurationsService.setzen(dto.werte());
        return new SystemConfigDto(konfigurationsService.alle());
    }
}
