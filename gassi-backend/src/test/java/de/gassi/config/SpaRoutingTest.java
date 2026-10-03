package de.gassi.config;

import de.gassi.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class SpaRoutingTest extends AbstractIntegrationTest {

    @Test
    void deepLinkPlanUnterpfadWirdZurSpaWeitergeleitet() throws Exception {
        mvc.perform(get("/plan/1"))
            .andExpect(status().isOk())
            .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    void deepLinkVerwaltungUnterpfadWirdZurSpaWeitergeleitet() throws Exception {
        mvc.perform(get("/verwaltung/teammitglieder"))
            .andExpect(status().isOk())
            .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    void registrierungTeamUnterpfadWirdZurSpaWeitergeleitet() throws Exception {
        mvc.perform(get("/registrierung/team"))
            .andExpect(status().isOk())
            .andExpect(forwardedUrl("/index.html"));
    }

    @Test
    void apiPfadeWerdenNichtWeitergeleitet() throws Exception {
        mvc.perform(get("/api/gibt-es-nicht"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void statischeDateienMitPunktWerdenNichtWeitergeleitet() throws Exception {
        mvc.perform(get("/gibt-es-nicht.png"))
            .andExpect(status().isNotFound())
            .andExpect(result -> assertThat(result.getResponse().getContentAsString())
                .contains("RESSOURCE_NICHT_GEFUNDEN"));
    }
}
