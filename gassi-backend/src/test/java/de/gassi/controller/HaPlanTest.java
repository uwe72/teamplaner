package de.gassi.controller;

import de.gassi.AbstractIntegrationTest;
import de.gassi.service.HaToken;
import de.gassi.service.ZeitService;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class HaPlanTest extends AbstractIntegrationTest {

    private static final String TOKEN = "ha-test-token";

    @Autowired
    private HaToken haToken;

    @Autowired
    private ZeitService zeitService;

    @BeforeEach
    void tokenSetzen() {
        ReflectionTestUtils.setField(haToken, "token", TOKEN);
    }

    @AfterEach
    void tokenZuruecksetzen() {
        ReflectionTestUtils.setField(haToken, "token", "");
    }

    private JsonNode aufbau() throws Exception {
        datenLoeschen();
        registrieren(eindeutig("super"), "super@example.de", "pw");

        String adminLogin = eindeutig("admin");
        JsonNode adminKonto = registrieren(adminLogin, adminLogin + "@example.de", "pw");
        String adminToken = adminKonto.get("token").asText();
        String teamName = "Team-" + adminLogin;
        Long teamId = teamAnlegen(adminToken, teamName).get("teamId").asLong();

        String mitgliedLogin = eindeutig("mitglied");
        MvcResult mitglied = mvc.perform(post("/api/teams/%d/mitglieder".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType("application/json")
                .content("{\"login\":\"%s\",\"email\":\"%s@example.de\",\"passwort\":\"pw\",\"anzeigename\":\"Anna\"}"
                    .formatted(mitgliedLogin, mitgliedLogin)))
            .andExpect(status().isCreated())
            .andReturn();
        Long annaId = om.readTree(mitglied.getResponse().getContentAsString()).get("id").asLong();

        MvcResult bereich = mvc.perform(post("/api/teams/%d/bereiche".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType("application/json")
                .content("{\"name\":\"Gassi\"}"))
            .andExpect(status().isCreated())
            .andReturn();
        Long bereichId = om.readTree(bereich.getResponse().getContentAsString()).get("id").asLong();

        MvcResult morgens = mvc.perform(post("/api/teams/%d/bereiche/%d/zeitfenster".formatted(teamId, bereichId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType("application/json")
                .content("{\"name\":\"Morgens\"}"))
            .andExpect(status().isCreated())
            .andReturn();
        Long morgensId = om.readTree(morgens.getResponse().getContentAsString()).get("id").asLong();

        MvcResult abends = mvc.perform(post("/api/teams/%d/bereiche/%d/zeitfenster".formatted(teamId, bereichId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType("application/json")
                .content("{\"name\":\"Abends\"}"))
            .andExpect(status().isCreated())
            .andReturn();
        Long abendsId = om.readTree(abends.getResponse().getContentAsString()).get("id").asLong();

        MvcResult aufgabeMorgens = mvc.perform(
                post("/api/teams/%d/bereiche/%d/zeitfenster/%d/aufgaben".formatted(teamId, bereichId, morgensId))
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType("application/json")
                    .content("{\"name\":\"Gassi Blue\"}"))
            .andExpect(status().isCreated())
            .andReturn();
        Long aufgabeMorgensId = om.readTree(aufgabeMorgens.getResponse().getContentAsString()).get("id").asLong();

        MvcResult aufgabeAbends = mvc.perform(
                post("/api/teams/%d/bereiche/%d/zeitfenster/%d/aufgaben".formatted(teamId, bereichId, abendsId))
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType("application/json")
                    .content("{\"name\":\"Gassi Red\"}"))
            .andExpect(status().isCreated())
            .andReturn();
        Long aufgabeAbendsId = om.readTree(aufgabeAbends.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(put("/api/teams/%d/bereiche/%d/soll".formatted(teamId, bereichId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType("application/json")
                .content("[{\"mitgliedId\":%d,\"wert\":10}]".formatted(annaId)))
            .andExpect(status().isOk());

        LocalDate heute = zeitService.heute();
        mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType("application/json")
                .content("{\"aufgabeId\":%d,\"datum\":\"%s\",\"mitgliedId\":%d}"
                    .formatted(aufgabeMorgensId, heute, annaId)))
            .andExpect(status().isCreated());

        return om.createObjectNode()
            .put("teamId", teamId)
            .put("teamName", teamName)
            .put("bereichId", bereichId)
            .put("annaId", annaId)
            .put("aufgabeMorgensId", aufgabeMorgensId)
            .put("aufgabeAbendsId", aufgabeAbendsId)
            .put("heute", heute.toString())
            .put("adminToken", adminToken)
            .put("kw", zeitService.isoWoche(heute))
            .put("von", heute.with(java.time.DayOfWeek.MONDAY).toString())
            .put("bis", heute.with(java.time.DayOfWeek.SUNDAY).toString());
    }

    @Test
    void planMitTokenLiefertAktuelleWoche() throws Exception {
        JsonNode daten = aufbau();

        MvcResult result = mvc.perform(get("/api/ha/plan/%d".formatted(daten.get("bereichId").asLong()))
                .header("X-HA-Token", TOKEN))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andReturn();
        JsonNode plan = om.readTree(result.getResponse().getContentAsString());

        assertThat(plan.get("team").asText()).isEqualTo(daten.get("teamName").asText());
        assertThat(plan.get("bereich").asText()).isEqualTo("Gassi");
        assertThat(plan.get("kw").asInt()).isEqualTo(daten.get("kw").asInt());
        assertThat(plan.get("von").asText()).isEqualTo(daten.get("von").asText());
        assertThat(plan.get("bis").asText()).isEqualTo(daten.get("bis").asText());
        assertThat(plan.get("stand").asText()).matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}[+-]\\d{2}:\\d{2}");
        assertThat(plan.get("slots").toString()).isEqualTo("[\"Morgens\",\"Abends\"]");
        assertThat(plan.get("tage")).hasSize(7);
        assertThat(plan.get("tage").get(0).get("tag").asText()).isEqualTo("Mo");
        assertThat(plan.get("tage").get(6).get("tag").asText()).isEqualTo("So");
        LocalDate heute = LocalDate.parse(daten.get("heute").asText());
        int tageAbHeute = 7 - heute.getDayOfWeek().getValue() + 1;
        int offenErwartet = 2 * tageAbHeute - 1;
        assertThat(plan.get("offen").asInt()).isEqualTo(offenErwartet);
    }

    @Test
    void planMarkiertHeuteUndZuteilungen() throws Exception {
        JsonNode daten = aufbau();
        String heute = daten.get("heute").asText();

        MvcResult result = mvc.perform(get("/api/ha/plan/%d".formatted(daten.get("bereichId").asLong()))
                .header("X-HA-Token", TOKEN))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode plan = om.readTree(result.getResponse().getContentAsString());

        JsonNode person = findePerson(plan, "Anna");
        assertThat(person.get("kuerzel").asText()).isEqualTo("AN");
        assertThat(person.get("ist").asInt()).isEqualTo(1);
        assertThat(person.get("soll").asInt()).isEqualTo(10);
        assertThat(person.hasNonNull("foto")).isFalse();

        JsonNode heuteTag = null;
        for (JsonNode tag : plan.get("tage")) {
            if (tag.get("datum").asText().equals(heute)) {
                heuteTag = tag;
            }
        }
        assertThat(heuteTag).isNotNull();
        assertThat(heuteTag.get("heute").asBoolean()).isTrue();
        assertThat(heuteTag.get("runden")).hasSize(2);
        assertThat(heuteTag.get("runden").get(0).get("slot").asText()).isEqualTo("Morgens");
        assertThat(heuteTag.get("runden").get(0).get("frei").asBoolean()).isFalse();
        assertThat(heuteTag.get("runden").get(0).get("personen").get(0).asText()).isEqualTo("AN");
        assertThat(heuteTag.get("runden").get(1).get("slot").asText()).isEqualTo("Abends");
        assertThat(heuteTag.get("runden").get(1).get("frei").asBoolean()).isTrue();
        assertThat(heuteTag.get("runden").get(1).get("personen")).isEmpty();
    }

    @Test
    void planFehlenderTokenGibt401() throws Exception {
        JsonNode daten = aufbau();

        mvc.perform(get("/api/ha/plan/%d".formatted(daten.get("bereichId").asLong())))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void planFalscherTokenGibt401() throws Exception {
        JsonNode daten = aufbau();

        mvc.perform(get("/api/ha/plan/%d".formatted(daten.get("bereichId").asLong()))
                .header("X-HA-Token", "falsch"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void planUnbekannterBereichGibt404() throws Exception {
        aufbau();

        mvc.perform(get("/api/ha/plan/999999")
                .header("X-HA-Token", TOKEN))
            .andExpect(status().isNotFound());
    }

    @Test
    void planOhneKonfiguriertenTokenGibt404() throws Exception {
        JsonNode daten = aufbau();
        ReflectionTestUtils.setField(haToken, "token", "");
        mvc.perform(get("/api/ha/plan/%d".formatted(daten.get("bereichId").asLong()))
                    .header("X-HA-Token", TOKEN))
                .andExpect(status().isNotFound());

            mvc.perform(get("/api/ha/foto/1?k=" + TOKEN))
                .andExpect(status().isNotFound());
    }

    @Test
    void fotoMitTokenLiefertBildMitCacheHeader() throws Exception {
        JsonNode daten = aufbau();
        Long annaId = daten.get("annaId").asLong();
        String adminToken = daten.get("adminToken").asText();
        Long teamId = daten.get("teamId").asLong();

        mvc.perform(MockMvcRequestBuilders.multipart(
                    org.springframework.http.HttpMethod.PUT,
                    "/api/teams/%d/mitglieder/%d/avatar".formatted(teamId, annaId))
                .file(new MockMultipartFile("file", "bild.png", "image/png", new byte[]{1, 2, 3, 4, 5}))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk());

        MvcResult plan = mvc.perform(get("/api/ha/plan/%d".formatted(daten.get("bereichId").asLong()))
                .header("X-HA-Token", TOKEN))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode person = findePerson(om.readTree(plan.getResponse().getContentAsString()), "Anna");
        assertThat(person.get("foto").asText()).isEqualTo("/api/ha/foto/" + annaId);

        mvc.perform(get("/api/ha/foto/%d?k=%s".formatted(annaId, TOKEN)))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "max-age=86400"))
            .andExpect(content().bytes(new byte[]{1, 2, 3, 4, 5}));
    }

    @Test
    void fotoFehlenderOderFalscherTokenGibt401() throws Exception {
        JsonNode daten = aufbau();
        Long annaId = daten.get("annaId").asLong();

        mvc.perform(get("/api/ha/foto/%d".formatted(annaId)))
            .andExpect(status().isUnauthorized());

        mvc.perform(get("/api/ha/foto/%d?k=falsch".formatted(annaId)))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void fotoOhneAvatarGibt404() throws Exception {
        JsonNode daten = aufbau();

        mvc.perform(get("/api/ha/foto/%d?k=%s".formatted(daten.get("annaId").asLong(), TOKEN)))
            .andExpect(status().isNotFound());
    }

    @Test
    void planLiefertStatistikWieStatistikseite() throws Exception {
        JsonNode daten = aufbau();
        LocalDate heute = LocalDate.parse(daten.get("heute").asText());
        LocalDate gestern = heute.minusDays(1);
        long aufkommenProWoche = 14;
        long aufkommenProTag = Math.round(aufkommenProWoche / 7.0);

        mvc.perform(post("/api/teams/%d/zuteilungen".formatted(daten.get("teamId").asLong()))
                .header("Authorization", "Bearer " + daten.get("adminToken").asText())
                .contentType("application/json")
                .content("{\"aufgabeId\":%d,\"datum\":\"%s\",\"mitgliedId\":%d}"
                    .formatted(daten.get("aufgabeAbendsId").asLong(), gestern,
                        daten.get("annaId").asLong())))
            .andExpect(status().isCreated());

        LocalDate ersterMontag = heute.with(java.time.DayOfWeek.MONDAY);
        boolean gesternAbTeamstart = !gestern.isBefore(ersterMontag);
        long abgelaufeneTage = gesternAbTeamstart
            ? java.time.temporal.ChronoUnit.DAYS.between(ersterMontag, gestern) + 1
            : 0;
        long gesamtSumme = abgelaufeneTage * aufkommenProTag;
        int anzahlGesamt = gesternAbTeamstart ? 1 : 0;
        double prozentGesamt = gesamtSumme > 0
            ? Math.round(100.0 * anzahlGesamt / gesamtSumme * 10.0) / 10.0
            : 0.0;

        long zieleSumme;
        int anzahlZiele;
        double prozentZiele;
        long sollProWoche = 10;
        zieleSumme = gesternAbTeamstart ? sollProWoche : 0;
        anzahlZiele = gesternAbTeamstart ? 1 : 0;
        prozentZiele = zieleSumme > 0
            ? Math.round(100.0 * anzahlZiele / zieleSumme * 10.0) / 10.0
            : 0.0;

        MvcResult result = mvc.perform(get("/api/ha/plan/%d".formatted(daten.get("bereichId").asLong()))
                .header("X-HA-Token", TOKEN))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode statistik = om.readTree(result.getResponse().getContentAsString()).get("statistik");

        JsonNode gesamt = statistik.get("gesamt");
        assertThat(gesamt.get("titel").asText()).isEqualTo("Seit Teamstart");
        assertThat(gesamt.get("summe").asLong()).isEqualTo(gesamtSumme);

        JsonNode gesamtPersonen = gesamt.get("personen");
        assertThat(gesamtPersonen).hasSize(2);
        if (gesternAbTeamstart) {
            assertThat(gesamtPersonen.get(0).get("kuerzel").asText()).isEqualTo("AN");
            assertThat(gesamtPersonen.get(0).get("anzahl").asLong()).isEqualTo(anzahlGesamt);
            assertThat(gesamtPersonen.get(0).get("prozent").asDouble()).isEqualTo(prozentGesamt);
            assertThat(gesamtPersonen.get(1).get("anzahl").asLong()).isZero();
            assertThat(gesamtPersonen.get(1).get("prozent").asDouble()).isZero();
        } else {
            assertThat(gesamtPersonen.get(0).get("kuerzel").asText()).isEqualTo("AD");
            assertThat(gesamtPersonen.get(0).get("anzahl").asLong()).isZero();
            assertThat(gesamtPersonen.get(0).get("prozent").asDouble()).isZero();
            assertThat(gesamtPersonen.get(1).get("kuerzel").asText()).isEqualTo("AN");
            assertThat(gesamtPersonen.get(1).get("anzahl").asLong()).isZero();
            assertThat(gesamtPersonen.get(1).get("prozent").asDouble()).isZero();
        }

        JsonNode ziele = statistik.get("zielerreichung");
        assertThat(ziele.get("titel").asText()).isEqualTo("Zielerreichung");
        assertThat(ziele.get("summe").asLong()).isEqualTo(zieleSumme);

        JsonNode zielePersonen = ziele.get("personen");
        assertThat(zielePersonen).hasSize(1);
        assertThat(zielePersonen.get(0).get("kuerzel").asText()).isEqualTo("AN");
        assertThat(zielePersonen.get(0).get("anzahl").asLong()).isEqualTo(anzahlZiele);
        assertThat(zielePersonen.get(0).get("prozent").asDouble()).isEqualTo(prozentZiele);
        for (JsonNode block : new JsonNode[]{gesamt, ziele}) {
            for (JsonNode person : block.get("personen")) {
                assertThat(person.has("foto")).isFalse();
                assertThat(person.has("name")).isFalse();
            }
        }
    }

    private JsonNode findePerson(JsonNode plan, String name) {
        for (JsonNode person : plan.get("personen")) {
            if (person.get("name").asText().equals(name)) {
                return person;
            }
        }
        return null;
    }
}
