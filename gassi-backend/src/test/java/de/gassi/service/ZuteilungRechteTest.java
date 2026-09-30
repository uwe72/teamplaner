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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class ZuteilungRechteTest extends AbstractIntegrationTest {

    private String adminToken;
    private Long adminId;
    private Long teamId;
    private Long bereichId;
    private Long aufgabeId;
    private Long mitgliedId;
    private String mitgliedToken;

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
        Long zeitfensterId = om.readTree(zeitfenster.getResponse().getContentAsString()).get("id").asLong();

        MvcResult aufgaben = mvc.perform(
                post("/api/teams/%d/bereiche/%d/zeitfenster/%d/aufgaben".formatted(teamId, bereichId, zeitfensterId))
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"Gassi Blue\"}"))
            .andExpect(status().isCreated())
            .andReturn();
        aufgabeId = om.readTree(aufgaben.getResponse().getContentAsString()).get("id").asLong();

        String mitgliedLogin = eindeutig("anna");
        MvcResult angelegt = mvc.perform(post("/api/teams/%d/mitglieder".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"%s\",\"email\":\"%s@example.de\",\"passwort\":\"pw\",\"anzeigename\":\"Anna\",\"farbe\":\"#ff0000\"}"
                    .formatted(mitgliedLogin, mitgliedLogin)))
            .andExpect(status().isCreated())
            .andReturn();
        mitgliedId = om.readTree(angelegt.getResponse().getContentAsString()).get("id").asLong();

        MvcResult session = mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"%s\",\"passwort\":\"pw\"}".formatted(mitgliedLogin)))
            .andExpect(status().isOk())
            .andReturn();
        mitgliedToken = om.readTree(session.getResponse().getContentAsString()).get("token").asText();
    }

    private String zuteilungsBody(Long aufgabe, LocalDate datum, Long mitglied) {
        return "{\"aufgabeId\":%d,\"datum\":\"%s\",\"mitgliedId\":%d}".formatted(aufgabe, datum, mitglied);
    }

    @Test
    void mitgliedDarfHeuteUndZukunftSetzen() throws Exception {
        aufbau();
        LocalDate heute = LocalDate.now(ZoneId.of("Europe/Berlin"));

        mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                .header("Authorization", "Bearer " + mitgliedToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(zuteilungsBody(aufgabeId, heute, mitgliedId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.mitgliedId").value(mitgliedId));

        mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                .header("Authorization", "Bearer " + mitgliedToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(zuteilungsBody(aufgabeId, heute.plusDays(3), mitgliedId)))
            .andExpect(status().isCreated());
    }

    @Test
    void mitgliedDarfVergangenheitNichtAendern() throws Exception {
        aufbau();
        LocalDate gestern = LocalDate.now(ZoneId.of("Europe/Berlin")).minusDays(1);

        mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                .header("Authorization", "Bearer " + mitgliedToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(zuteilungsBody(aufgabeId, gestern, mitgliedId)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("VERGANGENHEIT_GESPERRT"));
    }

    @Test
    void adminDarfVergangenheitAendern() throws Exception {
        aufbau();
        LocalDate gestern = LocalDate.now(ZoneId.of("Europe/Berlin")).minusDays(1);

        mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(zuteilungsBody(aufgabeId, gestern, mitgliedId)))
            .andExpect(status().isCreated());
    }

    @Test
    void ueberschreibenErsetztBestehendeZuteilung() throws Exception {
        aufbau();
        LocalDate heute = LocalDate.now(ZoneId.of("Europe/Berlin"));

        mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                .header("Authorization", "Bearer " + mitgliedToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(zuteilungsBody(aufgabeId, heute, mitgliedId)))
            .andExpect(status().isCreated());

        mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(zuteilungsBody(aufgabeId, heute, adminId)))
            .andExpect(status().isCreated());

        MvcResult plan = mvc.perform(get("/api/teams/%d/plan".formatted(teamId))
                .param("bereichId", String.valueOf(bereichId))
                .param("isoJahr", String.valueOf(heute.get(WeekFields.ISO.weekBasedYear())))
                .param("isoWoche", String.valueOf(heute.get(WeekFields.ISO.weekOfWeekBasedYear())))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode planJson = om.readTree(plan.getResponse().getContentAsString());
        JsonNode zuteilungen = planJson.get("gruppen").get(0).get("zeilen").get(0).get("zuteilungen");
        JsonNode heutigeZuteilung = null;
        for (JsonNode z : zuteilungen) {
            if (z.get("datum").asText().equals(heute.toString())) {
                heutigeZuteilung = z;
            }
        }
        assertThat(heutigeZuteilung).isNotNull();
        assertThat(heutigeZuteilung.get("mitgliedId").asLong()).isEqualTo(adminId);
    }

    @Test
    void loeschenEntferntZuteilung() throws Exception {
        aufbau();
        LocalDate heute = LocalDate.now(ZoneId.of("Europe/Berlin"));

        MvcResult erstellt = mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                .header("Authorization", "Bearer " + mitgliedToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(zuteilungsBody(aufgabeId, heute, mitgliedId)))
            .andExpect(status().isCreated())
            .andReturn();
        Long id = om.readTree(erstellt.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(MockMvcRequestBuilders.delete("/api/teams/%d/zuteilungen/%d".formatted(teamId, id))
                .header("Authorization", "Bearer " + mitgliedToken))
            .andExpect(status().isNoContent());

        MvcResult plan = mvc.perform(get("/api/teams/%d/plan".formatted(teamId))
                .param("bereichId", String.valueOf(bereichId))
                .param("isoJahr", String.valueOf(heute.get(WeekFields.ISO.weekBasedYear())))
                .param("isoWoche", String.valueOf(heute.get(WeekFields.ISO.weekOfWeekBasedYear())))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode planJson = om.readTree(plan.getResponse().getContentAsString());
        assertThat(planJson.get("gruppen").get(0).get("zeilen").get(0).get("zuteilungen").get(tagIndex(heute))
            .get("id").isNull()).isTrue();
    }

    private int tagIndex(LocalDate datum) {
        return datum.getDayOfWeek().getValue() - 1;
    }
}
