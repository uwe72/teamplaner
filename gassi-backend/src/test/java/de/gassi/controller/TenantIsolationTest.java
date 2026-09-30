package de.gassi.controller;

import de.gassi.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class TenantIsolationTest extends AbstractIntegrationTest {

    @Test
    void fremdesTeammitgliedBekommt403() throws Exception {
        datenLoeschen();
        registrieren(eindeutig("super"), "super@example.de", "pw");

        String adminA = eindeutig("a-admin");
        var kontoA = registrieren(adminA, adminA + "@example.de", "pw");
        Long teamA = teamAnlegen(kontoA.get("token").asText(), "Team-A-" + adminA).get("teamId").asLong();

        String adminB = eindeutig("b-admin");
        var kontoB = registrieren(adminB, adminB + "@example.de", "pw");
        Long teamB = teamAnlegen(kontoB.get("token").asText(), "Team-B-" + adminB).get("teamId").asLong();

        mvc.perform(get("/api/teams/%d/mitglieder".formatted(teamA))
                .header("Authorization", "Bearer " + kontoB.get("token").asText()))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("KEIN_TEAMZUGRIFF"));

        mvc.perform(get("/api/teams/%d/bereiche".formatted(teamB))
                .header("Authorization", "Bearer " + kontoA.get("token").asText()))
            .andExpect(status().isForbidden());

        mvc.perform(get("/api/teams/%d/plan".formatted(teamB))
                .param("bereichId", "999999")
                .param("isoJahr", "2026")
                .param("isoWoche", "1")
                .header("Authorization", "Bearer " + kontoA.get("token").asText()))
            .andExpect(status().isForbidden());

        mvc.perform(get("/api/teams/%d/statistik".formatted(teamB))
                .param("bereichId", "999999")
                .header("Authorization", "Bearer " + kontoA.get("token").asText()))
            .andExpect(status().isForbidden());
    }

    @Test
    void superAdminHatZugriffAufFremdeTeams() throws Exception {
        datenLoeschen();
        String superToken = registrieren(eindeutig("super"), "super@example.de", "pw").get("token").asText();
        registrieren(eindeutig("x"), "x@example.de", "pw");

        String adminLogin = eindeutig("admin");
        var konto = registrieren(adminLogin, adminLogin + "@example.de", "pw");
        Long teamId = teamAnlegen(konto.get("token").asText(), "Fremdteam-" + adminLogin).get("teamId").asLong();

        mvc.perform(get("/api/teams/%d/mitglieder".formatted(teamId))
                .header("Authorization", "Bearer " + superToken))
            .andExpect(status().isOk());
    }
}
