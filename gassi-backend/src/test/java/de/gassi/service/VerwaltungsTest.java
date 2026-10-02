package de.gassi.service;

import de.gassi.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class VerwaltungsTest extends AbstractIntegrationTest {

    private String superToken;
    private String adminToken;
    private Long teamId;
    private Long bereichId;

    private void aufbau() throws Exception {
        datenLoeschen();
        superToken = registrieren(eindeutig("super"), "super@example.de", "pw").get("token").asText();

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
    }

    private Long zeitfensterAnlegen(String name) throws Exception {
        MvcResult zeitfenster = mvc.perform(post("/api/teams/%d/bereiche/%d/zeitfenster".formatted(teamId, bereichId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"%s\"}".formatted(name)))
            .andExpect(status().isCreated())
            .andReturn();
        return om.readTree(zeitfenster.getResponse().getContentAsString()).get("id").asLong();
    }

    private String erstelleMitgliedToken(String anzeigename) throws Exception {
        String login = eindeutig("mitglied");
        mvc.perform(post("/api/teams/%d/mitglieder".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"%s\",\"email\":\"%s@example.de\",\"passwort\":\"pw\",\"anzeigename\":\"%s\"}"
                    .formatted(login, login, anzeigename)))
            .andExpect(status().isCreated());
        return anmelden(login, "pw").get("token").asText();
    }

    @Test
    void normalerNutzerDarfVerwaltungNichtAendern() throws Exception {
        aufbau();
        String mitgliedToken = erstelleMitgliedToken("Anna");

        mvc.perform(post("/api/teams/%d/bereiche".formatted(teamId))
                .header("Authorization", "Bearer " + mitgliedToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Hacker\"}"))
            .andExpect(status().isForbidden());

        mvc.perform(post("/api/teams/%d/mitglieder".formatted(teamId))
                .header("Authorization", "Bearer " + mitgliedToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"hacker\",\"email\":\"h@example.de\",\"passwort\":\"pw\",\"anzeigename\":\"H\"}"))
            .andExpect(status().isForbidden());

        mvc.perform(MockMvcRequestBuilders.put("/api/teams/%d/bereiche/%d/soll".formatted(teamId, bereichId))
                .header("Authorization", "Bearer " + mitgliedToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("[{\"mitgliedId\":1,\"wert\":3}]"))
            .andExpect(status().isForbidden());
    }

    @Test
    void bereichsnamenMüssenEindeutigSein() throws Exception {
        aufbau();
        mvc.perform(post("/api/teams/%d/bereiche".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"gassi\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("NAME_BELEGT"));
    }

    @Test
    void bereicheAendernUndDeaktivieren() throws Exception {
        aufbau();
        mvc.perform(put("/api/teams/%d/bereiche/%d".formatted(teamId, bereichId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Gassi & Hunde\",\"aktiv\":false,\"position\":3}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Gassi & Hunde"))
            .andExpect(jsonPath("$.aktiv").value(false))
            .andExpect(jsonPath("$.position").value(3));

        MvcResult liste = mvc.perform(get("/api/teams/%d/bereiche".formatted(teamId))
                .param("alle", "true")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode bereich = null;
        for (JsonNode b : om.readTree(liste.getResponse().getContentAsString())) {
            if (b.get("id").asLong() == bereichId) {
                bereich = b;
            }
        }
        assertThat(bereich).isNotNull();
        assertThat(bereich.get("aktiv").asBoolean()).isFalse();
    }

    @Test
    void letzterAdminKannNichtDeaktiviertWerden() throws Exception {
        aufbau();
        Long adminId = null;
        MvcResult mitglieder = mvc.perform(get("/api/teams/%d/mitglieder".formatted(teamId))
                .param("alle", "true")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn();
        for (JsonNode m : om.readTree(mitglieder.getResponse().getContentAsString())) {
            if (m.get("rolle").asText().equals("ADMIN")) {
                adminId = m.get("id").asLong();
            }
        }

        mvc.perform(put("/api/teams/%d/mitglieder/%d".formatted(teamId, adminId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"anzeigename\":\"Admin\",\"email\":\"admin@example.de\",\"aktiv\":false}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("LETZTER_ADMIN"));
    }

    @Test
    void mitgliedAendernUndDeaktivierenFunktioniertMitZweitemAdmin() throws Exception {
        aufbau();
        String login = eindeutig("mitglied");
        MvcResult angelegt = mvc.perform(post("/api/teams/%d/mitglieder".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"%s\",\"email\":\"%s@example.de\",\"passwort\":\"pw\",\"anzeigename\":\"Anna\",\"rolle\":\"ADMIN\"}"
                    .formatted(login, login)))
            .andExpect(status().isCreated())
            .andReturn();
        Long id = om.readTree(angelegt.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(put("/api/teams/%d/mitglieder/%d".formatted(teamId, id))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"anzeigename\":\"Anna B.\",\"email\":\"%s@example.de\",\"aktiv\":false}"
                    .formatted(login)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.anzeigename").value("Anna B."))
            .andExpect(jsonPath("$.aktiv").value(false));

        String adminId = null;
        MvcResult mitglieder = mvc.perform(get("/api/teams/%d/mitglieder".formatted(teamId))
                .param("alle", "true")
                .header("Authorization", "Bearer " + adminToken))
            .andReturn();
        for (JsonNode m : om.readTree(mitglieder.getResponse().getContentAsString())) {
            if (m.get("rolle").asText().equals("ADMIN") && m.get("id").asLong() != id) {
                adminId = String.valueOf(m.get("id").asLong());
            }
        }
        assertThat(adminId).isNotNull();
    }

    @Test
    void sollSummenwarnungBeiAbweichung() throws Exception {
        aufbau();
        String login = eindeutig("mitglied");
        MvcResult angelegt = mvc.perform(post("/api/teams/%d/mitglieder".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"%s\",\"email\":\"%s@example.de\",\"passwort\":\"pw\",\"anzeigename\":\"Anna\"}"
                    .formatted(login, login)))
            .andExpect(status().isCreated())
            .andReturn();
        Long mitgliedId = om.readTree(angelegt.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(post("/api/teams/%d/bereiche/%d/zeitfenster".formatted(teamId, bereichId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Morgens\"}"))
            .andExpect(status().isCreated());

        MvcResult sollListe = mvc.perform(get("/api/teams/%d/bereiche/%d/soll".formatted(teamId, bereichId))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.aufkommenProWoche").value(0))
            .andExpect(jsonPath("$.sollSumme").value(0))
            .andExpect(jsonPath("$.summenwarnung").value(false))
            .andReturn();

        mvc.perform(put("/api/teams/%d/bereiche/%d/soll".formatted(teamId, bereichId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("[{\"mitgliedId\":%d,\"wert\":2}]".formatted(mitgliedId)))
            .andExpect(status().isOk());

        mvc.perform(get("/api/teams/%d/bereiche/%d/soll".formatted(teamId, bereichId))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sollSumme").value(2))
            .andExpect(jsonPath("$.summenwarnung").value(true));

        MvcResult zeitfenster = mvc.perform(post("/api/teams/%d/bereiche/%d/zeitfenster".formatted(teamId, bereichId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Abends\"}"))
            .andExpect(status().isCreated())
            .andReturn();
        Long zeitfensterId = om.readTree(zeitfenster.getResponse().getContentAsString()).get("id").asLong();

        mvc.perform(post("/api/teams/%d/bereiche/%d/zeitfenster/%d/aufgaben".formatted(teamId, bereichId, zeitfensterId))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Gassi\"}"))
            .andExpect(status().isCreated());

        mvc.perform(get("/api/teams/%d/bereiche/%d/soll".formatted(teamId, bereichId))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.aufkommenProWoche").value(7))
            .andExpect(jsonPath("$.sollSumme").value(2))
            .andExpect(jsonPath("$.summenwarnung").value(true));
    }

    @Test
    void aufgabennamenSindNurProZeitfensterEindeutig() throws Exception {
        aufbau();
        Long erstes = zeitfensterAnlegen("Morgens");
        Long zweites = zeitfensterAnlegen("Abends");

        mvc.perform(post("/api/teams/%d/bereiche/%d/zeitfenster/%d/aufgaben".formatted(teamId, bereichId, erstes))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Gassi\"}"))
            .andExpect(status().isCreated());

        mvc.perform(post("/api/teams/%d/bereiche/%d/zeitfenster/%d/aufgaben".formatted(teamId, bereichId, erstes))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"gassi\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("NAME_BELEGT"));

        mvc.perform(post("/api/teams/%d/bereiche/%d/zeitfenster/%d/aufgaben".formatted(teamId, bereichId, zweites))
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Gassi\"}"))
            .andExpect(status().isCreated());
    }

    @Test
    void superAdminVerwaltetTeamsUndKonfiguration() throws Exception {
        aufbau();

        mvc.perform(get("/api/super/teams").header("Authorization", "Bearer " + superToken))
            .andExpect(status().isOk());

        mvc.perform(put("/api/super/teams/%d".formatted(teamId))
                .header("Authorization", "Bearer " + superToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Umbenanntes Team\",\"aktiv\":false}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Umbenanntes Team"))
            .andExpect(jsonPath("$.aktiv").value(false));

        mvc.perform(get("/api/super/config").header("Authorization", "Bearer " + superToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.werte.SMTP_HOST").exists());

        mvc.perform(put("/api/super/config")
                .header("Authorization", "Bearer " + superToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"werte\":{\"SMTP_HOST\":\"smtp.example.de\",\"SMTP_PORT\":\"587\",\"SMTP_BENUTZER\":\"x\",\"SMTP_PASSWORT\":\"y\",\"SMTP_ABSENDER\":\"z@example.de\",\"WEB_URL\":\"https://gassi.ipv64.de\"}}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.werte.WEB_URL").value("https://gassi.ipv64.de"));

        mvc.perform(get("/api/super/teams").header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isForbidden());
    }
}
