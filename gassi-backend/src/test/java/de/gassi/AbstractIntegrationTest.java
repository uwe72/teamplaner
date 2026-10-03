package de.gassi;

import de.gassi.repository.AufgabeRepository;
import de.gassi.repository.BereichRepository;
import de.gassi.repository.BesuchLogRepository;
import de.gassi.repository.PasswortResetTokenRepository;
import de.gassi.repository.SollRepository;
import de.gassi.repository.SystemConfigRepository;
import de.gassi.repository.TeamRepository;
import de.gassi.repository.TeammitgliedRepository;
import de.gassi.repository.ZeitfensterRepository;
import de.gassi.repository.ZuteilungRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    @Autowired
    protected MockMvc mvc;
    @Autowired
    protected ObjectMapper om;
    @Autowired
    private ZuteilungRepository zuteilungRepository;
    @Autowired
    private SollRepository sollRepository;
    @Autowired
    private AufgabeRepository aufgabeRepository;
    @Autowired
    private ZeitfensterRepository zeitfensterRepository;
    @Autowired
    private BereichRepository bereichRepository;
    @Autowired
    private BesuchLogRepository besuchLogRepository;
    @Autowired
    private PasswortResetTokenRepository passwortResetTokenRepository;
    @Autowired
    private TeammitgliedRepository teammitgliedRepository;
    @Autowired
    private TeamRepository teamRepository;
    @Autowired
    private SystemConfigRepository systemConfigRepository;

    private static final AtomicInteger ZAEHLER = new AtomicInteger(0);

    @PostConstruct
    void basisdatenLoeschen() {
        datenLoeschen();
    }

    protected void datenLoeschen() {
        zuteilungRepository.deleteAll();
        sollRepository.deleteAll();
        aufgabeRepository.deleteAll();
        zeitfensterRepository.deleteAll();
        bereichRepository.deleteAll();
        besuchLogRepository.deleteAll();
        passwortResetTokenRepository.deleteAll();
        teammitgliedRepository.deleteAll();
        teamRepository.deleteAll();
        systemConfigRepository.deleteAll();
    }

    protected String eindeutig(String praefix) {
        return praefix + UUID.randomUUID().toString().substring(0, 6) + ZAEHLER.incrementAndGet();
    }

    protected JsonNode registrieren(String login, String email, String passwort) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/registrieren")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"login":"%s","email":"%s","passwort":"%s"}
                    """.formatted(login, email, passwort)))
            .andReturn();
        return om.readTree(result.getResponse().getContentAsString());
    }

    protected JsonNode teamAnlegen(String token, String teamName) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/team")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"teamName\":\"%s\"}".formatted(teamName)))
            .andReturn();
        return om.readTree(result.getResponse().getContentAsString());
    }

    protected JsonNode anmelden(String login, String passwort) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"login\":\"%s\",\"passwort\":\"%s\"}".formatted(login, passwort)))
            .andReturn();
        return om.readTree(result.getResponse().getContentAsString());
    }
}
