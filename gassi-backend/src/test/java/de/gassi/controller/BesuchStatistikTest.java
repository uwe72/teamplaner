package de.gassi.controller;

import de.gassi.AbstractIntegrationTest;
import de.gassi.repository.BesuchLogRepository;
import de.gassi.repository.TeammitgliedRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class BesuchStatistikTest extends AbstractIntegrationTest {

    @Autowired
    private BesuchLogRepository besuchLogRepository;
    @Autowired
    private TeammitgliedRepository teammitgliedRepository;

    private String superToken;
    private String adminToken;
    private Long teamId;
    private Long mitgliedId;

    private void aufbau() throws Exception {
        datenLoeschen();
        superToken = registrieren(eindeutig("super"), "super@example.de", "pw").get("token").asText();

        String adminLogin = eindeutig("admin");
        adminToken = registrieren(adminLogin, adminLogin + "@example.de", "pw").get("token").asText();
        teamId = teamAnlegen(adminToken, "Team-" + adminLogin).get("teamId").asLong();

        String mitgliedLogin = eindeutig("anna");
        MvcResult angelegt = mvc.perform(post("/api/teams/%d/mitglieder".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"login":"%s","email":"%s@example.de","passwort":"pw","anzeigename":"Anna","rolle":"MITGLIED"}
                    """.formatted(mitgliedLogin, mitgliedLogin)))
            .andExpect(status().isCreated())
            .andReturn();
        mitgliedId = om.readTree(angelegt.getResponse().getContentAsString()).get("id").asLong();
    }

    private String mitgliedToken() throws Exception {
        String login = teammitgliedRepository.findById(mitgliedId).orElseThrow().getLogin();
        return anmelden(login, "pw").get("token").asText();
    }

    @Test
    void besuchWirdProTagNurEinmalGezaehlt() throws Exception {
        aufbau();
        String token = mitgliedToken();

        mvc.perform(post("/api/teams/%d/besuche".formatted(teamId))
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNoContent());
        mvc.perform(post("/api/teams/%d/besuche".formatted(teamId))
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNoContent());

        assertThat(besuchLogRepository.count()).isEqualTo(1);
        assertThat(teammitgliedRepository.findById(mitgliedId).orElseThrow().getBesuchAnzahl()).isEqualTo(1);

        MvcResult statistik = mvc.perform(get("/api/teams/%d/statistik/besuche".formatted(teamId))
                .param("von", LocalDate.now().withDayOfMonth(1).toString())
                .param("bis", LocalDate.now().plusDays(1).toString())
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();
        var monat = om.readTree(statistik.getResponse().getContentAsString()).get("monate").get(0);
        assertThat(monat.get("besucheGesamt").asLong()).isEqualTo(1);
        assertThat(monat.get("mitglieder").get(0).get("login").asText())
            .isEqualTo(teammitgliedRepository.findById(mitgliedId).orElseThrow().getLogin());
    }

    @Test
    void superAdminWirdNichtGezaehlt() throws Exception {
        aufbau();

        mvc.perform(post("/api/teams/%d/besuche".formatted(teamId))
                .header("Authorization", "Bearer " + superToken))
            .andExpect(status().isNoContent());

        assertThat(besuchLogRepository.count()).isZero();
    }

    @Test
    void statistikNurFuerAdmins() throws Exception {
        aufbau();
        String token = mitgliedToken();

        mvc.perform(get("/api/teams/%d/statistik/besuche".formatted(teamId))
                .param("von", LocalDate.now().withDayOfMonth(1).toString())
                .param("bis", LocalDate.now().plusDays(1).toString())
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("KEINE_BERECHTIGUNG"));

        mvc.perform(get("/api/teams/%d/statistik/besuche/zeitverlauf".formatted(teamId))
                .param("granularitaet", "MONAT")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isForbidden());
    }

    @Test
    void fremdesTeamBekommtKeinTeamzugriff() throws Exception {
        aufbau();
        String adminB = registrieren(eindeutig("fremd"), "fremd@example.de", "pw").get("token").asText();
        teamAnlegen(adminB, "Fremd-" + eindeutig("T"));

        mvc.perform(post("/api/teams/%d/besuche".formatted(teamId))
                .header("Authorization", "Bearer " + adminB))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("KEIN_TEAMZUGRIFF"));

        mvc.perform(get("/api/teams/%d/statistik/besuche".formatted(teamId))
                .param("von", LocalDate.now().withDayOfMonth(1).toString())
                .param("bis", LocalDate.now().plusDays(1).toString())
                .header("Authorization", "Bearer " + adminB))
            .andExpect(status().isForbidden());
    }

    @Test
    void ohneAnmeldungBleibt401() throws Exception {
        aufbau();

        mvc.perform(post("/api/teams/%d/besuche".formatted(teamId)))
            .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/teams/%d/statistik/besuche".formatted(teamId))
                .param("von", LocalDate.now().withDayOfMonth(1).toString())
                .param("bis", LocalDate.now().plusDays(1).toString()))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void zeitraumMussGueltigSein() throws Exception {
        aufbau();

        mvc.perform(get("/api/teams/%d/statistik/besuche".formatted(teamId))
                .param("von", "2026-01-02")
                .param("bis", "2026-01-01")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("ZEITRAUM_UNGUELTIG"));
    }

    @Test
    void unbekannteGranularitaetWirdAbgelehnt() throws Exception {
        aufbau();

        mvc.perform(get("/api/teams/%d/statistik/besuche/zeitverlauf".formatted(teamId))
                .param("granularitaet", "STUNDE")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("GRANULARITAET_UNGUELTIG"));
    }

    @Test
    void zeitverlaufFuellBucketsUndDistinct() throws Exception {
        aufbau();

        mvc.perform(post("/api/teams/%d/besuche".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isNoContent());

        MvcResult zeitverlauf = mvc.perform(get("/api/teams/%d/statistik/besuche/zeitverlauf".formatted(teamId))
                .param("granularitaet", "TAG")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();
        var verlauf = om.readTree(zeitverlauf.getResponse().getContentAsString());
        assertThat(verlauf.get("granularitaet").asText()).isEqualTo("TAG");
        assertThat(verlauf.get("gesamtMitglieder").asLong()).isEqualTo(2);
        var buckets = verlauf.get("bucketListe");
        assertThat(buckets.size()).isEqualTo(60);
        var letzter = buckets.get(buckets.size() - 1);
        assertThat(letzter.get("periodenStart").asText()).isEqualTo(LocalDate.now().toString());
        assertThat(letzter.get("besuche").asLong()).isEqualTo(1);
        assertThat(letzter.get("verschiedeneMitglieder").asLong()).isEqualTo(1);
    }

    @Test
    void superAdminSiehtBesucheUeberTeamsHinweg() throws Exception {
        aufbau();

        String adminB = registrieren(eindeutig("annb"), "annb@example.de", "pw").get("token").asText();
        Long teamB = teamAnlegen(adminB, "Team-B-" + eindeutig("X")).get("teamId").asLong();

        mvc.perform(post("/api/teams/%d/besuche".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isNoContent());
        mvc.perform(post("/api/teams/%d/besuche".formatted(teamB))
                .header("Authorization", "Bearer " + adminB))
            .andExpect(status().isNoContent());

        MvcResult statistik = mvc.perform(get("/api/super/besuche")
                .param("von", LocalDate.now().withDayOfMonth(1).toString())
                .param("bis", LocalDate.now().plusDays(1).toString())
                .header("Authorization", "Bearer " + superToken))
            .andExpect(status().isOk())
            .andReturn();
        var statistikJson = om.readTree(statistik.getResponse().getContentAsString());
        assertThat(statistikJson.get("monate").get(0).get("besucheGesamt").asLong()).isEqualTo(2);
        var mitglieder = statistikJson.get("monate").get(0).get("mitglieder");
        assertThat(mitglieder.size()).isEqualTo(2);
        for (int i = 0; i < mitglieder.size(); i++) {
            assertThat(mitglieder.get(i).get("teamName").asText()).isNotBlank();
        }
        assertThat(mitglieder.get(0).get("teamName").asText() + mitglieder.get(1).get("teamName").asText())
            .contains("Team-B-");

        MvcResult teams = mvc.perform(get("/api/super/besuche/teams")
                .param("von", LocalDate.now().withDayOfMonth(1).toString())
                .param("bis", LocalDate.now().plusDays(1).toString())
                .header("Authorization", "Bearer " + superToken))
            .andExpect(status().isOk())
            .andReturn();
        var teamsJson = om.readTree(teams.getResponse().getContentAsString());
        assertThat(teamsJson.size()).isEqualTo(2);
        assertThat(teamsJson.get(0).get("besuche").asLong()).isEqualTo(1);
        assertThat(teamsJson.get(0).get("verschiedeneMitglieder").asLong()).isEqualTo(1);

        MvcResult zeitverlauf = mvc.perform(get("/api/super/besuche/zeitverlauf")
                .param("granularitaet", "TAG")
                .header("Authorization", "Bearer " + superToken))
            .andExpect(status().isOk())
            .andReturn();
        var verlaufJson = om.readTree(zeitverlauf.getResponse().getContentAsString());
        var buckets = verlaufJson.get("bucketListe");
        assertThat(buckets.size()).isEqualTo(60);
        assertThat(buckets.get(buckets.size() - 1).get("besuche").asLong()).isEqualTo(2);
        assertThat(buckets.get(buckets.size() - 1).get("verschiedeneMitglieder").asLong()).isEqualTo(2);
    }

    @Test
    void superBesucheNurFuerSuperAdmin() throws Exception {
        aufbau();

        mvc.perform(get("/api/super/besuche")
                .param("von", LocalDate.now().withDayOfMonth(1).toString())
                .param("bis", LocalDate.now().plusDays(1).toString())
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isForbidden());

        mvc.perform(get("/api/super/besuche/teams")
                .param("von", LocalDate.now().withDayOfMonth(1).toString())
                .param("bis", LocalDate.now().plusDays(1).toString()))
            .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/super/besuche")
                .param("von", "2026-01-02")
                .param("bis", "2026-01-01")
                .header("Authorization", "Bearer " + superToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("ZEITRAUM_UNGUELTIG"));

        mvc.perform(get("/api/super/besuche/zeitverlauf")
                .param("granularitaet", "STUNDE")
                .header("Authorization", "Bearer " + superToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("GRANULARITAET_UNGUELTIG"));
    }
}
