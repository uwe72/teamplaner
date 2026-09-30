package de.gassi.controller;

import de.gassi.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class AuthUndRegistrierungTest extends AbstractIntegrationTest {

    @Test
    void ersteRegistrierungWirdSuperAdminOhneTeam() throws Exception {
        datenLoeschen();
        String login = eindeutig("uwe");
        JsonNode antwort = registrieren(login, login + "@example.de", "pw1");

        assertThat(antwort.get("rolle").asText()).isEqualTo("SUPER_ADMIN");
        assertThat(antwort.get("teamId").isNull()).isTrue();
        assertThat(antwort.get("teamOeffen").asBoolean()).isFalse();
        assertThat(antwort.get("token").asText()).isNotBlank();
        assertThat(antwort.get("refreshToken").asText()).isNotBlank();
    }

    @Test
    void weitereRegistrierungWirdTeamAdminOhneTeam() throws Exception {
        datenLoeschen();
        registrieren(eindeutig("uwe"), "uwe@example.de", "pw1");
        String login = eindeutig("anna");
        JsonNode antwort = registrieren(login, "anna@example.de", "pw2");

        assertThat(antwort.get("rolle").asText()).isEqualTo("ADMIN");
        assertThat(antwort.get("teamOeffen").asBoolean()).isTrue();
        assertThat(antwort.get("teamId").isNull()).isTrue();
    }

    @Test
    void teamAnlegenNachRegistrierung() throws Exception {
        datenLoeschen();
        registrieren(eindeutig("uwe"), "uwe@example.de", "pw1");
        String token = registrieren(eindeutig("anna"), "anna@example.de", "pw2").get("token").asText();
        String teamName = eindeutig("Familie");

        MvcResult result = mvc.perform(post("/api/auth/team")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"teamName\":\"%s\"}".formatted(teamName)))
            .andExpect(status().isOk())
            .andReturn();
        JsonNode antwort = om.readTree(result.getResponse().getContentAsString());

        assertThat(antwort.get("teamId").asLong()).isPositive();
        assertThat(antwort.get("teamName").asText()).isEqualTo(teamName);
        assertThat(antwort.get("teamOeffen").asBoolean()).isFalse();
    }

    @Test
    void teamnameMussEindeutigSein() throws Exception {
        datenLoeschen();
        registrieren(eindeutig("uwe"), "uwe@example.de", "pw1");
        String login1 = eindeutig("anna");
        JsonNode konto1 = registrieren(login1, login1 + "@example.de", "pw1");
        teamAnlegen(konto1.get("token").asText(), "Team_" + login1);

        String login2 = eindeutig("bert");
        JsonNode konto2 = registrieren(login2, login2 + "@example.de", "pw2");
        mvc.perform(post("/api/auth/team")
                .header("Authorization", "Bearer " + konto2.get("token").asText())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"teamName\":\"Team_" + login1 + "\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("TEAMNAME_BELEGT"));
    }

    @Test
    void loginnameMussEindeutigSein() throws Exception {
        datenLoeschen();
        registrieren(eindeutig("uwe"), "uwe@example.de", "pw1");
        String login = eindeutig("anna");
        registrieren(login, login + "@example.de", "pw1");

        mvc.perform(post("/api/auth/registrieren")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"%s\",\"email\":\"andere@example.de\",\"passwort\":\"pw\"}".formatted(login.toUpperCase())))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("LOGINNAME_BELEGT"));
    }

    @Test
    void loginnameDarfKeineEmailSein() throws Exception {
        datenLoeschen();
        mvc.perform(post("/api/auth/registrieren")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"uwe@example.de\",\"email\":\"uwe@example.de\",\"passwort\":\"pw\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void loginFunktioniertUndFehlgeschlagenWirdGenerischGemeldet() throws Exception {
        datenLoeschen();
        String login = eindeutig("uwe");
        registrieren(login, login + "@example.de", "pw1");

        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"%s\",\"passwort\":\"pw1\"}".formatted(login)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty());

        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"%s\",\"passwort\":\"falsch\"}".formatted(login)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("LOGIN_FEHLGESCHLAGEN"));
    }

    @Test
    void checkLoginZeigtVerfuegbarkeit() throws Exception {
        datenLoeschen();
        String login = eindeutig("uwe");
        registrieren(login, login + "@example.de", "pw1");

        mvc.perform(get("/api/auth/check-login").param("login", login))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.verfuegbar").value(false));

        mvc.perform(get("/api/auth/check-login").param("login", eindeutig("frei")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.verfuegbar").value(true));
    }

    @Test
    void profilAnsehenOhneTokenFuehrtZu401() throws Exception {
        datenLoeschen();
        registrieren(eindeutig("uwe"), "uwe@example.de", "pw1");
        String login = eindeutig("anna");
        String token = registrieren(login, login + "@example.de", "pw1").get("token").asText();

        mvc.perform(get("/api/auth/profil").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.login").value(login));

        mvc.perform(get("/api/auth/profil"))
            .andExpect(status().isUnauthorized());

        mvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"nonsense\"}"))
            .andExpect(status().isBadRequest());
    }
}
