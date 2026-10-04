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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class PlanUndStatistikTest extends AbstractIntegrationTest {

    private String adminToken;
    private Long teamId;
    private Long bereichId;
    private Long mitgliedId;

    private void aufbau() throws Exception {
        datenLoeschen();
        registrieren(eindeutig("super"), "super@example.de", "pw");

        String adminLogin = eindeutig("admin");
        JsonNode adminKonto = registrieren(adminLogin, adminLogin + "@example.de", "pw");
        adminToken = adminKonto.get("token").asText();
        JsonNode team = teamAnlegen(adminToken, "Team-" + adminLogin);
        teamId = team.get("teamId").asLong();

        MvcResult bereiche = mvc.perform(post("/api/teams/%d/bereiche".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Gassi\"}"))
            .andExpect(status().isCreated())
            .andReturn();
        bereichId = om.readTree(bereiche.getResponse().getContentAsString()).get("id").asLong();

        String mitgliedLogin = eindeutig("anna");
        MvcResult angelegt = mvc.perform(post("/api/teams/%d/mitglieder".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"%s\",\"email\":\"%s@example.de\",\"passwort\":\"pw\",\"anzeigename\":\"Anna\"}"
                    .formatted(mitgliedLogin, mitgliedLogin)))
            .andExpect(status().isCreated())
            .andReturn();
        mitgliedId = om.readTree(angelegt.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long zeitfensterAnlegen(String name) throws Exception {
        MvcResult result = mvc.perform(post("/api/teams/%d/bereiche/%d/zeitfenster".formatted(teamId, bereichId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"%s\"}".formatted(name)))
            .andExpect(status().isCreated())
            .andReturn();
        return om.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private Long aufgabeAnlegen(Long zeitfensterId, String name) throws Exception {
        MvcResult result = mvc.perform(
                post("/api/teams/%d/bereiche/%d/zeitfenster/%d/aufgaben".formatted(teamId, bereichId, zeitfensterId))
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"name\":\"%s\"}".formatted(name)))
            .andExpect(status().isCreated())
            .andReturn();
        return om.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private void sollSetzen(long wert) throws Exception {
        mvc.perform(MockMvcRequestBuilders.put("/api/teams/%d/bereiche/%d/soll".formatted(teamId, bereichId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("[{\"mitgliedId\":%d,\"wert\":%d}]".formatted(mitgliedId, wert)))
            .andExpect(status().isOk());
    }

    @Test
    void planZeigtAktiveAufgabenMitSollBadge() throws Exception {
        aufbau();
        LocalDate heute = LocalDate.now(ZoneId.of("Europe/Berlin"));
        int isoJahr = heute.get(WeekFields.ISO.weekBasedYear());
        int isoWoche = heute.get(WeekFields.ISO.weekOfWeekBasedYear());

        Long zfw = zeitfensterAnlegen("Morgens");
        Long taeglich = aufgabeAnlegen(zfw, "Gassi Blue");
        aufgabeAnlegen(zfw, "Nur Montag");

        sollSetzen(2);

        mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"aufgabeId\":%d,\"datum\":\"%s\",\"mitgliedId\":%d}".formatted(taeglich, heute, mitgliedId)))
            .andExpect(status().isCreated());

        MvcResult plan = mvc.perform(get("/api/teams/%d/plan".formatted(teamId))
                .param("bereichId", String.valueOf(bereichId))
                .param("isoJahr", String.valueOf(isoJahr))
                .param("isoWoche", String.valueOf(isoWoche))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode planJson = om.readTree(plan.getResponse().getContentAsString());

        assertThat(planJson.get("tage").size()).isEqualTo(7);
        assertThat(planJson.get("gruppen").size()).isEqualTo(1);
        assertThat(planJson.get("gruppen").get(0).get("zeilen").size()).isEqualTo(2);
        assertThat(planJson.get("gruppen").get(0).get("zeitfensterName").asText()).isEqualTo("Morgens");
        JsonNode mitglieder = planJson.get("mitglieder");
        JsonNode anna = null;
        for (JsonNode m : mitglieder) {
            if (m.get("id").asLong() == mitgliedId) {
                anna = m;
            }
        }
        assertThat(anna).isNotNull();
        assertThat(anna.get("ist").asLong()).isEqualTo(1);
        assertThat(anna.get("sollUnterschritten").asBoolean()).isTrue();
    }

    @Test
    void deaktivierteAufgabeTauchtNichtImPlanAuf() throws Exception {
        aufbau();
        LocalDate heute = LocalDate.now(ZoneId.of("Europe/Berlin"));
        int isoJahr = heute.get(WeekFields.ISO.weekBasedYear());
        int isoWoche = heute.get(WeekFields.ISO.weekOfWeekBasedYear());

        Long zfw = zeitfensterAnlegen("Morgens");
        Long aufgabe = aufgabeAnlegen(zfw, "Gassi Blue");
        mvc.perform(MockMvcRequestBuilders.put("/api/teams/%d/bereiche/%d/aufgaben/%d".formatted(teamId, bereichId, aufgabe))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"aktiv\":false}"))
            .andExpect(status().isOk());

        mvc.perform(get("/api/teams/%d/plan".formatted(teamId))
                .param("bereichId", String.valueOf(bereichId))
                .param("isoJahr", String.valueOf(isoJahr))
                .param("isoWoche", String.valueOf(isoWoche))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.gruppen[0].zeilen").isEmpty());
    }

    @Test
    void statistikProWocheUndKumuliert() throws Exception {
        aufbau();
        LocalDate heute = LocalDate.now(ZoneId.of("Europe/Berlin"));
        LocalDate gestern = heute.minusDays(1);
        int isoJahr = gestern.get(WeekFields.ISO.weekBasedYear());
        int isoWoche = gestern.get(WeekFields.ISO.weekOfWeekBasedYear());

        Long zfw = zeitfensterAnlegen("Morgens");
        Long taeglich = aufgabeAnlegen(zfw, "Gassi Blue");
        mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"aufgabeId\":%d,\"datum\":\"%s\",\"mitgliedId\":%d}".formatted(taeglich, gestern, mitgliedId)))
            .andExpect(status().isCreated());

        MvcResult statistik = mvc.perform(get("/api/teams/%d/statistik".formatted(teamId))
                .param("bereichId", String.valueOf(bereichId))
                .param("isoJahr", String.valueOf(isoJahr))
                .param("isoWoche", String.valueOf(isoWoche))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode statistikJson = om.readTree(statistik.getResponse().getContentAsString());
        JsonNode annaWoche = null;
        for (JsonNode zeile : statistikJson.get("wochenweise")) {
            if (zeile.get("mitgliedId").asLong() == mitgliedId) {
                annaWoche = zeile;
            }
        }
        assertThat(annaWoche).isNotNull();
        assertThat(annaWoche.get("ist").asLong()).isEqualTo(1);
        assertThat(annaWoche.get("moeglich").asLong()).isEqualTo(7);

        MvcResult statistikKumuliert = mvc.perform(get("/api/teams/%d/statistik".formatted(teamId))
                .param("bereichId", String.valueOf(bereichId))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode kumuliertJson = om.readTree(statistikKumuliert.getResponse().getContentAsString());
        JsonNode annaKumuliert = null;
        for (JsonNode zeile : kumuliertJson.get("kumuliert")) {
            if (zeile.get("mitgliedId").asLong() == mitgliedId) {
                annaKumuliert = zeile;
            }
        }
        assertThat(annaKumuliert).isNotNull();
        LocalDate ersterMontag = heute.with(java.time.DayOfWeek.MONDAY);
        long abgelaufeneTageAktuelleWoche = gestern.isBefore(ersterMontag)
            ? 0
            : java.time.temporal.ChronoUnit.DAYS.between(ersterMontag, gestern) + 1;
        assertThat(annaKumuliert.get("ist").asLong())
            .isEqualTo(gestern.isBefore(ersterMontag) ? 0 : 1);
        assertThat(annaKumuliert.get("moeglich").asLong()).isEqualTo(abgelaufeneTageAktuelleWoche);
    }

    @Test
    void statistikMonatlichZaehltNurAktuellenMonat() throws Exception {
        aufbau();
        LocalDate heute = LocalDate.now(ZoneId.of("Europe/Berlin"));
        LocalDate gestern = heute.minusDays(1);

        Long zfw = zeitfensterAnlegen("Morgens");
        Long taeglich = aufgabeAnlegen(zfw, "Gassi Blue");
        mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"aufgabeId\":%d,\"datum\":\"%s\",\"mitgliedId\":%d}".formatted(taeglich, gestern, mitgliedId)))
            .andExpect(status().isCreated());

        LocalDate ersterMonatstag = heute.withDayOfMonth(1);
        if (ersterMonatstag.isBefore(gestern)) {
            mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                    .header("Authorization", "Bearer " + adminToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"aufgabeId\":%d,\"datum\":\"%s\",\"mitgliedId\":%d}".formatted(taeglich, ersterMonatstag, mitgliedId)))
                .andExpect(status().isCreated());
        }

        MvcResult statistik = mvc.perform(get("/api/teams/%d/statistik".formatted(teamId))
                .param("bereichId", String.valueOf(bereichId))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode statistikJson = om.readTree(statistik.getResponse().getContentAsString());
        JsonNode annaMonat = null;
        for (JsonNode zeile : statistikJson.get("monatlich")) {
            if (zeile.get("mitgliedId").asLong() == mitgliedId) {
                annaMonat = zeile;
            }
        }
        assertThat(annaMonat).isNotNull();
        long aufkommenProTag = Math.round(7 / 7.0);
        if (!ersterMonatstag.isEqual(gestern) && ersterMonatstag.isBefore(gestern)) {
            assertThat(annaMonat.get("ist").asLong()).isEqualTo(2);
        } else if (ersterMonatstag.isEqual(gestern)) {
            assertThat(annaMonat.get("ist").asLong()).isEqualTo(1);
        } else {
            assertThat(annaMonat.get("ist").asLong()).isEqualTo(0);
        }
        long moeglich = ersterMonatstag.isAfter(gestern) ? 0 : gestern.getDayOfMonth() * aufkommenProTag;
        assertThat(annaMonat.get("moeglich").asLong()).isEqualTo(moeglich);
    }

    @Test
    void statistikMonatlichBrowsbarInVergangeneMonate() throws Exception {
        aufbau();
        LocalDate heute = LocalDate.now(ZoneId.of("Europe/Berlin"));
        LocalDate vorMonatstag = heute.withDayOfMonth(1).minusDays(1);
        java.time.YearMonth zielMonat = java.time.YearMonth.from(vorMonatstag);

        Long zfw = zeitfensterAnlegen("Morgens");
        Long taeglich = aufgabeAnlegen(zfw, "Gassi Blue");
        mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"aufgabeId\":%d,\"datum\":\"%s\",\"mitgliedId\":%d}".formatted(taeglich, vorMonatstag, mitgliedId)))
            .andExpect(status().isCreated());

        MvcResult statistik = mvc.perform(get("/api/teams/%d/statistik".formatted(teamId))
                .param("bereichId", String.valueOf(bereichId))
                .param("jahr", String.valueOf(zielMonat.getYear()))
                .param("monat", String.valueOf(zielMonat.getMonthValue()))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode statistikJson = om.readTree(statistik.getResponse().getContentAsString());
        JsonNode annaMonat = null;
        for (JsonNode zeile : statistikJson.get("monatlich")) {
            if (zeile.get("mitgliedId").asLong() == mitgliedId) {
                annaMonat = zeile;
            }
        }
        assertThat(annaMonat).isNotNull();
        assertThat(annaMonat.get("ist").asLong()).isEqualTo(1);
        assertThat(annaMonat.get("moeglich").asLong()).isEqualTo(zielMonat.lengthOfMonth());

        mvc.perform(get("/api/teams/%d/statistik".formatted(teamId))
                .param("bereichId", String.valueOf(bereichId))
                .param("jahr", String.valueOf(zielMonat.getYear()))
                .param("monat", "13")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("MONAT_UNGUELTIG"));
    }

    @Test
    void statistikIgnoriertZukunftszuteilungen() throws Exception {
        aufbau();
        LocalDate heute = LocalDate.now(ZoneId.of("Europe/Berlin"));
        LocalDate gestern = heute.minusDays(1);
        LocalDate morgen = heute.plusDays(1);
        int isoJahr = gestern.get(WeekFields.ISO.weekBasedYear());
        int isoWoche = gestern.get(WeekFields.ISO.weekOfWeekBasedYear());
        int isoJahrZukunft = morgen.get(WeekFields.ISO.weekBasedYear());
        int isoWocheZukunft = morgen.get(WeekFields.ISO.weekOfWeekBasedYear());

        Long zfw = zeitfensterAnlegen("Morgens");
        Long taeglich = aufgabeAnlegen(zfw, "Gassi Blue");
        mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"aufgabeId\":%d,\"datum\":\"%s\",\"mitgliedId\":%d}".formatted(taeglich, gestern, mitgliedId)))
            .andExpect(status().isCreated());
        mvc.perform(post("/api/teams/%d/zuteilungen".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"aufgabeId\":%d,\"datum\":\"%s\",\"mitgliedId\":%d}".formatted(taeglich, morgen, mitgliedId)))
            .andExpect(status().isCreated());

        boolean gleicheWoche = isoJahr == isoJahrZukunft && isoWoche == isoWocheZukunft;

        MvcResult statistikGesamt = mvc.perform(get("/api/teams/%d/statistik".formatted(teamId))
                .param("bereichId", String.valueOf(bereichId))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode gesamtJson = om.readTree(statistikGesamt.getResponse().getContentAsString());

        JsonNode annaKumuliert = zeileFuerMitglied(gesamtJson.get("kumuliert"), mitgliedId);
        assertThat(annaKumuliert).isNotNull();
        LocalDate ersterMontag = heute.with(java.time.DayOfWeek.MONDAY);
        boolean gesternAbTeamstart = !gestern.isBefore(ersterMontag);
        long abgelaufeneTage = gesternAbTeamstart
            ? java.time.temporal.ChronoUnit.DAYS.between(ersterMontag, gestern) + 1
            : 0;
        assertThat(annaKumuliert.get("ist").asLong()).isEqualTo(gesternAbTeamstart ? 1 : 0);
        assertThat(annaKumuliert.get("moeglich").asLong()).isEqualTo(abgelaufeneTage);

        JsonNode annaMonat = zeileFuerMitglied(gesamtJson.get("monatlich"), mitgliedId);
        assertThat(annaMonat).isNotNull();
        LocalDate ersterMonatstag = heute.withDayOfMonth(1);
        if (ersterMonatstag.isAfter(gestern)) {
            assertThat(annaMonat.get("ist").asLong()).isEqualTo(0);
            assertThat(annaMonat.get("moeglich").asLong()).isEqualTo(0);
        } else {
            assertThat(annaMonat.get("ist").asLong()).isEqualTo(1);
            assertThat(annaMonat.get("moeglich").asLong()).isEqualTo(gestern.getDayOfMonth());
        }

        if (gleicheWoche) {
            MvcResult statistikWoche = mvc.perform(get("/api/teams/%d/statistik".formatted(teamId))
                    .param("bereichId", String.valueOf(bereichId))
                    .param("isoJahr", String.valueOf(isoJahrZukunft))
                    .param("isoWoche", String.valueOf(isoWocheZukunft))
                    .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
            JsonNode wochenJson = om.readTree(statistikWoche.getResponse().getContentAsString());
            JsonNode annaWoche = zeileFuerMitglied(wochenJson.get("wochenweise"), mitgliedId);
            assertThat(annaWoche).isNotNull();
            assertThat(annaWoche.get("ist").asLong()).isEqualTo(1);
            assertThat(annaWoche.get("moeglich").asLong()).isEqualTo(7);
        }
    }

    private JsonNode zeileFuerMitglied(JsonNode zeilen, long mitgliedId) {
        for (JsonNode zeile : zeilen) {
            if (zeile.get("mitgliedId").asLong() == mitgliedId) {
                return zeile;
            }
        }
        return null;
    }

    @Test
    void planGruppiertAufgabenNachZeitfensterPrioritaet() throws Exception {
        aufbau();
        LocalDate heute = LocalDate.now(ZoneId.of("Europe/Berlin"));
        int isoJahr = heute.get(WeekFields.ISO.weekBasedYear());
        int isoWoche = heute.get(WeekFields.ISO.weekOfWeekBasedYear());

        Long abends = zeitfensterAnlegen("Abends");
        Long morgens = zeitfensterAnlegen("Morgens");

        mvc.perform(put("/api/teams/%d/bereiche/%d/zeitfenster/%d".formatted(teamId, bereichId, morgens))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"position\":0}"))
            .andExpect(status().isOk());
        mvc.perform(put("/api/teams/%d/bereiche/%d/zeitfenster/%d".formatted(teamId, bereichId, abends))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"position\":1}"))
            .andExpect(status().isOk());

        aufgabeAnlegen(abends, "Gassi Bella");
        aufgabeAnlegen(morgens, "Gassi Blue");

        MvcResult plan = mvc.perform(get("/api/teams/%d/plan".formatted(teamId))
                .param("bereichId", String.valueOf(bereichId))
                .param("isoJahr", String.valueOf(isoJahr))
                .param("isoWoche", String.valueOf(isoWoche))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode planJson = om.readTree(plan.getResponse().getContentAsString());

        assertThat(planJson.get("gruppen").size()).isEqualTo(2);
        assertThat(planJson.get("gruppen").get(0).get("zeitfensterName").asText()).isEqualTo("Morgens");
        assertThat(planJson.get("gruppen").get(1).get("zeitfensterName").asText()).isEqualTo("Abends");
        assertThat(planJson.get("gruppen").get(0).get("zeilen").get(0).get("aufgabe").get("name").asText())
            .isEqualTo("Gassi Blue");
        assertThat(planJson.get("gruppen").get(1).get("zeilen").get(0).get("aufgabe").get("name").asText())
            .isEqualTo("Gassi Bella");
    }
}
