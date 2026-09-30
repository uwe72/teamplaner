package de.gassi.controller;

import de.gassi.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import de.gassi.repository.PasswortResetTokenRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class PasswortResetTest extends AbstractIntegrationTest {

    @Autowired
    private PasswortResetTokenRepository tokenRepository;
    @Autowired
    private de.gassi.repository.TeammitgliedRepository teammitgliedRepository;

    @Test
    void einzelKontoBekommtResetTokenUndSetztNeuesPasswort() throws Exception {
        datenLoeschen();
        String login = eindeutig("uwe");
        registrieren(login, "geteilt@example.de", "altpasswort");

        mvc.perform(post("/api/auth/passwort-vergessen")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"geteilt@example.de\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mehrereKonten").value(false));

        String resetToken = tokenRepository.findAll().get(0).getToken();

        mvc.perform(post("/api/auth/passwort-zuruecksetzen")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"%s\",\"neuesPasswort\":\"neupasswort\"}".formatted(resetToken)))
            .andExpect(status().isOk());

        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"%s\",\"passwort\":\"neupasswort\"}".formatted(login)))
            .andExpect(status().isOk());

        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"%s\",\"passwort\":\"altpasswort\"}".formatted(login)))
            .andExpect(status().isConflict());
    }

    @Test
    void mehrereKontenVerlangenLoginAuswahl() throws Exception {
        datenLoeschen();
        registrieren(eindeutig("uwe"), "geteilt2@example.de", "pw1");
        registrieren(eindeutig("anna"), "geteilt2@example.de", "pw2");

        MvcResult result = mvc.perform(post("/api/auth/passwort-vergessen")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"geteilt2@example.de\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mehrereKonten").value(true))
            .andReturn();
        JsonNode antwort = om.readTree(result.getResponse().getContentAsString());
        assertThat(antwort.get("logins").size()).isEqualTo(2);
        assertThat(tokenRepository.findAll()).isEmpty();

        String gewuenschterLogin = antwort.get("logins").get(0).asText();
        mvc.perform(post("/api/auth/passwort-vergessen")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"geteilt2@example.de\",\"login\":\"%s\"}".formatted(gewuenschterLogin)))
            .andExpect(status().isOk());
        assertThat(tokenRepository.findAll()).hasSize(1);
        var token = tokenRepository.findAll().get(0);
        var mitglied = teammitgliedRepository.findById(token.getMitglied().getId()).orElseThrow();
        assertThat(mitglied.getLogin()).isEqualTo(gewuenschterLogin);
    }

    @Test
    void falscherTokenWirdAbgelehnt() throws Exception {
        datenLoeschen();
        mvc.perform(post("/api/auth/passwort-zuruecksetzen")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"gibt-es-nicht\",\"neuesPasswort\":\"x\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("RESET_TOKEN_UNGUELTIG"));
    }

    @Test
    void loginnamenAnfordernAntwortImmer200() throws Exception {
        datenLoeschen();
        registrieren(eindeutig("uwe"), "remind@example.de", "pw1");

        mvc.perform(post("/api/auth/loginname-vergessen")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"remind@example.de\"}"))
            .andExpect(status().isOk());

        mvc.perform(post("/api/auth/loginname-vergessen")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"unbekannt@example.de\"}"))
            .andExpect(status().isOk());
    }

    @Test
    void passwortAendernMitAltemPasswort() throws Exception {
        datenLoeschen();
        registrieren(eindeutig("uwe"), "uwe@example.de", "pw1");
        String login = eindeutig("anna");
        String token = registrieren(login, login + "@example.de", "pw1").get("token").asText();

        mvc.perform(put("/api/auth/passwort")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"altesPasswort\":\"pw1\",\"neuesPasswort\":\"neu123\"}"))
            .andExpect(status().isOk());

        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"%s\",\"passwort\":\"neu123\"}".formatted(login)))
            .andExpect(status().isOk());
    }
}
