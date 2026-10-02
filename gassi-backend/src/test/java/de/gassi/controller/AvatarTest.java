package de.gassi.controller;

import de.gassi.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class AvatarTest extends AbstractIntegrationTest {

    private JsonNode aufbau() throws Exception {
        datenLoeschen();
        registrieren(eindeutig("super"), "super@example.de", "pw");

        String adminLogin = eindeutig("admin");
        JsonNode adminKonto = registrieren(adminLogin, adminLogin + "@example.de", "pw");
        Long teamId = teamAnlegen(adminKonto.get("token").asText(), "Team-" + adminLogin).get("teamId").asLong();

        String mitgliedLogin = eindeutig("mitglied");
        MvcResult mitglied = mvc.perform(post("/api/teams/%d/mitglieder".formatted(teamId))
                .header("Authorization", "Bearer " + adminKonto.get("token").asText())
                .contentType("application/json")
                .content("{\"login\":\"%s\",\"email\":\"%s@example.de\",\"passwort\":\"pw\",\"anzeigename\":\"Anna\"}"
                    .formatted(mitgliedLogin, mitgliedLogin)))
            .andExpect(status().isCreated())
            .andReturn();
        Long mitgliedId = om.readTree(mitglied.getResponse().getContentAsString()).get("id").asLong();

        JsonNode mitgliedKonto = anmelden(mitgliedLogin, "pw");
        var adminNode = om.createObjectNode().put("token", adminKonto.get("token").asText());
        var mitgliedNode = om.createObjectNode().put("token", mitgliedKonto.get("token").asText());
        return om.createObjectNode()
            .put("teamId", teamId)
            .put("mitgliedId", mitgliedId)
            .<com.fasterxml.jackson.databind.node.ObjectNode>set("admin", adminNode)
            .set("mitglied", mitgliedNode);
    }

    private MockMultipartFile png() {
        return new MockMultipartFile("file", "bild.png", "image/png", new byte[]{1, 2, 3, 4, 5});
    }

    @Test
    void eigenesBildHochladenLadenLoeschen() throws Exception {
        JsonNode daten = aufbau();
        String token = daten.at("/admin/token").asText();

        mvc.perform(MockMvcRequestBuilders.multipart(HttpMethod.PUT, "/api/auth/me/avatar")
                .file(png())
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.avatarUrl").value("/api/auth/me/avatar"));

        mvc.perform(get("/api/auth/me/avatar")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(content().contentType("image/png"))
            .andExpect(content().bytes(new byte[]{1, 2, 3, 4, 5}))
            .andExpect(header().string("Cache-Control", "no-cache"));

        mvc.perform(delete("/api/auth/me/avatar")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNoContent());

        mvc.perform(get("/api/auth/me/avatar")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isNotFound());

        mvc.perform(get("/api/auth/profil")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.avatarUrl").doesNotExist());
    }

    @Test
    void ungültigerTypUndZuGroßesBildWerdenAbgelehnt() throws Exception {
        JsonNode daten = aufbau();
        String token = daten.at("/admin/token").asText();

        mvc.perform(MockMvcRequestBuilders.multipart(HttpMethod.PUT, "/api/auth/me/avatar")
                .file(new MockMultipartFile("file", "bild.gif", "image/gif", new byte[]{1}))
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("BILD_TYP_UNGUELTIG"));

        mvc.perform(MockMvcRequestBuilders.multipart(HttpMethod.PUT, "/api/auth/me/avatar")
                .file(new MockMultipartFile("file", "bild.png", "image/png", new byte[2 * 1024 * 1024 + 1]))
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("BILD_ZU_GROSS"));

        mvc.perform(MockMvcRequestBuilders.multipart(HttpMethod.PUT, "/api/auth/me/avatar")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("BILD_FEHLT"));
    }

    @Test
    void adminSetztBildFuerMitgliedUndBekommtAvatarUrl() throws Exception {
        JsonNode daten = aufbau();
        String adminToken = daten.at("/admin/token").asText();
        Long teamId = daten.get("teamId").asLong();
        Long mitgliedId = daten.get("mitgliedId").asLong();

        mvc.perform(MockMvcRequestBuilders.multipart(
                    HttpMethod.PUT, "/api/teams/%d/mitglieder/%d/avatar".formatted(teamId, mitgliedId))
                .file(png())
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.avatarUrl")
                .value("/api/teams/%d/mitglieder/%d/avatar".formatted(teamId, mitgliedId)));

        mvc.perform(get("/api/teams/%d/mitglieder".formatted(teamId))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[1].avatarUrl", 1)
                .value("/api/teams/%d/mitglieder/%d/avatar".formatted(teamId, mitgliedId)));

        String mitgliedToken = daten.at("/mitglied/token").asText();
        mvc.perform(get("/api/teams/%d/mitglieder/%d/avatar".formatted(teamId, mitgliedId))
                .header("Authorization", "Bearer " + mitgliedToken))
            .andExpect(status().isOk())
            .andExpect(content().contentType("image/png"));

        mvc.perform(delete("/api/teams/%d/mitglieder/%d/avatar".formatted(teamId, mitgliedId))
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isNoContent());

        mvc.perform(get("/api/teams/%d/mitglieder/%d/avatar".formatted(teamId, mitgliedId))
                .header("Authorization", "Bearer " + mitgliedToken))
            .andExpect(status().isNotFound());
    }

    @Test
    void mitgliedDarfFremdesBildNichtAendern() throws Exception {
        JsonNode daten = aufbau();
        String mitgliedToken = daten.at("/mitglied/token").asText();
        Long teamId = daten.get("teamId").asLong();
        Long mitgliedId = daten.get("mitgliedId").asLong();

        mvc.perform(MockMvcRequestBuilders.multipart(
                    HttpMethod.PUT, "/api/teams/%d/mitglieder/%d/avatar".formatted(teamId, mitgliedId))
                .file(png())
                .header("Authorization", "Bearer " + mitgliedToken))
            .andExpect(status().isForbidden());

        mvc.perform(delete("/api/teams/%d/mitglieder/%d/avatar".formatted(teamId, mitgliedId))
                .header("Authorization", "Bearer " + mitgliedToken))
            .andExpect(status().isForbidden());
    }

    @Test
    void fremdesTeamBekommtKeinBild() throws Exception {
        JsonNode daten = aufbau();
        String adminToken = daten.at("/admin/token").asText();
        Long teamId = daten.get("teamId").asLong();
        Long mitgliedId = daten.get("mitgliedId").asLong();

        mvc.perform(MockMvcRequestBuilders.multipart(
                    HttpMethod.PUT, "/api/teams/%d/mitglieder/%d/avatar".formatted(teamId, mitgliedId))
                .file(png())
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk());

        String fremderLogin = eindeutig("fremd");
        JsonNode fremder = registrieren(fremderLogin, fremderLogin + "@example.de", "pw");
        Long fremdTeam = teamAnlegen(fremder.get("token").asText(), "Fremd-" + fremderLogin).get("teamId").asLong();

        mvc.perform(get("/api/teams/%d/mitglieder/%d/avatar".formatted(teamId, mitgliedId))
                .header("Authorization", "Bearer " + fremder.get("token").asText()))
            .andExpect(status().isForbidden());
    }
}
