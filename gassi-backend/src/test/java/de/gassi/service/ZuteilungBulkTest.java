package de.gassi.service;

import de.gassi.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.WeekFields;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class ZuteilungBulkTest extends AbstractIntegrationTest {

    private String adminToken;
    private Long adminId;
    private Long teamId;
    private Long bereichId;
    private Long zeitfensterId;
    private Long aufgabe1Id;
    private Long aufgabe2Id;
    private Long mitgliedId;
    private String mitgliedToken;
    private Long anderesMitgliedId;
    private final Map<Long, String> logins = new HashMap<>();

    private void aufbau() throws Exception {
        datenLoeschen();
        registrieren(eindeutig("super"), "super@example.de", "pw");

        String adminLogin = eindeutig("admin");
        JsonNode adminKonto = registrieren(adminLogin, adminLogin + "@example.de", "pw");
        adminToken = adminKonto.get("token").asText();
        adminId = adminKonto.get("id").asLong();
        JsonNode team = teamAnlegen(adminToken, "Team-" + adminLogin);
        teamId = team.get("teamId").asLong();

        MvcResult bereiche = mvc.perform(post("/api/teams/%d/bereiche".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Gassi\"}"))
            .andExpect(status().isCreated())
            .andReturn();
        bereichId = om.readTree(bereiche.getResponse().getContentAsString()).get("id").asLong();

        MvcResult zeitfenster = mvc.perform(post("/api/teams/%d/bereiche/%d/zeitfenster".formatted(teamId, bereichId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Morgens\"}"))
            .andExpect(status().isCreated())
            .andReturn();
        zeitfensterId = om.readTree(zeitfenster.getResponse().getContentAsString()).get("id").asLong();

        aufgabe1Id = aufgabeAnlegen("Gassi Blue");
        aufgabe2Id = aufgabeAnlegen("Gassi Rot");

        String mitgliedLogin = eindeutig("anna");
        mitgliedId = mitgliedAnlegen(mitgliedLogin, "Anna");
        anderesMitgliedId = mitgliedAnlegen(eindeutig("ben"), "Ben");
        mitgliedToken = anmelden(mitgliedLogin, "pw").get("token").asText();
    }

    private Long aufgabeAnlegen(String name) throws Exception {
        MvcResult aufgabe = mvc.perform(
                post("/api/teams/%d/bereiche/%d/zeitfenster/%d/aufgaben".formatted(teamId, bereichId, zeitfensterId))
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"%s\"}".formatted(name)))
            .andExpect(status().isCreated())
            .andReturn();
        return om.readTree(aufgabe.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long mitgliedAnlegen(String login, String anzeigename) throws Exception {
        MvcResult angelegt = mvc.perform(post("/api/teams/%d/mitglieder".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"%s\",\"email\":\"%s@example.de\",\"passwort\":\"pw\",\"anzeigename\":\"%s\"}"
                    .formatted(login, login, anzeigename)))
            .andExpect(status().isCreated())
            .andReturn();
        Long id = om.readTree(angelegt.getResponse().getContentAsString()).get("id").asLong();
        logins.put(id, login);
        return id;
    }

    private String bulkBody(LocalDate datum, Long mitglied) {
        return "{\"datum\":\"%s\",\"mitgliedId\":%d}".formatted(datum, mitglied);
    }

    private MvcResult planAbfrage(LocalDate datum) throws Exception {
        return mvc.perform(get("/api/teams/%d/plan".formatted(teamId))
                .param("bereichId", String.valueOf(bereichId))
                .param("isoJahr", String.valueOf(datum.get(WeekFields.ISO.weekBasedYear())))
                .param("isoWoche", String.valueOf(datum.get(WeekFields.ISO.weekOfWeekBasedYear())))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();
    }

    @Test
    void weistAlleAufgabenDemMitgliedZu() throws Exception {
        aufbau();
        LocalDate heute = LocalDate.now(ZoneId.of("Europe/Berlin"));

        mvc.perform(post("/api/teams/%d/zeitfenster/%d/zuteilungen".formatted(teamId, zeitfensterId))
                .header("Authorization", "Bearer " + mitgliedToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(bulkBody(heute, mitgliedId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].mitgliedId").value(mitgliedId))
            .andExpect(jsonPath("$[1].mitgliedId").value(mitgliedId));

        JsonNode zeilen = om.readTree(planAbfrage(heute).getResponse().getContentAsString())
            .get("gruppen").get(0).get("zeilen");
        assertThat(zeilen.size()).isEqualTo(2);
        for (JsonNode zeile : zeilen) {
            assertThat(zeile.get("zuteilungen").get(tagIndex(heute)).get("mitgliedId").asLong()).isEqualTo(mitgliedId);
        }
    }

    @Test
    void ueberschreibtBestehendeZuteilungen() throws Exception {
        aufbau();
        LocalDate heute = LocalDate.now(ZoneId.of("Europe/Berlin"));

        mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"aufgabeId\":%d,\"datum\":\"%s\",\"mitgliedId\":%d}".formatted(aufgabe1Id, heute, anderesMitgliedId)))
            .andExpect(status().isCreated());

        mvc.perform(post("/api/teams/%d/zeitfenster/%d/zuteilungen".formatted(teamId, zeitfensterId))
                .header("Authorization", "Bearer " + mitgliedToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(bulkBody(heute, mitgliedId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.length()").value(2));

        JsonNode zeilen = om.readTree(planAbfrage(heute).getResponse().getContentAsString())
            .get("gruppen").get(0).get("zeilen");
        for (JsonNode zeile : zeilen) {
            assertThat(zeile.get("zuteilungen").get(tagIndex(heute)).get("mitgliedId").asLong()).isEqualTo(mitgliedId);
        }
    }

    @Test
    void mitgliedDarfVergangenheitNichtAendern() throws Exception {
        aufbau();
        LocalDate gestern = LocalDate.now(ZoneId.of("Europe/Berlin")).minusDays(1);

        mvc.perform(post("/api/teams/%d/zeitfenster/%d/zuteilungen".formatted(teamId, zeitfensterId))
                .header("Authorization", "Bearer " + mitgliedToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(bulkBody(gestern, mitgliedId)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("VERGANGENHEIT_GESPERRT"));
    }

    @Test
    void adminDarfVergangenheitAendern() throws Exception {
        aufbau();
        LocalDate gestern = LocalDate.now(ZoneId.of("Europe/Berlin")).minusDays(1);

        mvc.perform(post("/api/teams/%d/zeitfenster/%d/zuteilungen".formatted(teamId, zeitfensterId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(bulkBody(gestern, mitgliedId)))
            .andExpect(status().isCreated());
    }

    @Test
    void fremdesTeamBekommtKeinTeamzugriff() throws Exception {
        aufbau();
        registrieren(eindeutig("super2"), "super2@example.de", "pw");
        String fremdLogin = eindeutig("fremdadmin");
        JsonNode fremdKonto = registrieren(fremdLogin, fremdLogin + "@example.de", "pw");
        String fremdToken = fremdKonto.get("token").asText();
        teamAnlegen(fremdToken, "Fremd-" + fremdLogin);

        LocalDate heute = LocalDate.now(ZoneId.of("Europe/Berlin"));
        mvc.perform(post("/api/teams/%d/zeitfenster/%d/zuteilungen".formatted(teamId, zeitfensterId))
                .header("Authorization", "Bearer " + fremdToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(bulkBody(heute, mitgliedId)))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("KEIN_TEAMZUGRIFF"));
    }

    @Test
    void unbekanntesZeitfensterGibtFehler() throws Exception {
        aufbau();
        LocalDate heute = LocalDate.now(ZoneId.of("Europe/Berlin"));

        mvc.perform(post("/api/teams/%d/zeitfenster/%d/zuteilungen".formatted(teamId, 999999))
                .header("Authorization", "Bearer " + mitgliedToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(bulkBody(heute, mitgliedId)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("ZEITFENSTER_UNBEKANNT"));
    }

    @Test
    void deaktivierteAufgabenWerdenAusgelassen() throws Exception {
        aufbau();
        deaktiviereAufgabe(aufgabe2Id);
        LocalDate heute = LocalDate.now(ZoneId.of("Europe/Berlin"));

        mvc.perform(post("/api/teams/%d/zeitfenster/%d/zuteilungen".formatted(teamId, zeitfensterId))
                .header("Authorization", "Bearer " + mitgliedToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(bulkBody(heute, mitgliedId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].aufgabeId").value(aufgabe1Id));
    }

    private void deaktiviereAufgabe(Long aufgabeId) throws Exception {
        mvc.perform(MockMvcRequestBuilders
                .put("/api/teams/%d/bereiche/%d/aufgaben/%d".formatted(teamId, bereichId, aufgabeId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Gassi Rot\",\"aktiv\":false}"))
            .andExpect(status().isOk());
    }

    private int tagIndex(LocalDate datum) {
        return datum.getDayOfWeek().getValue() - 1;
    }
}
