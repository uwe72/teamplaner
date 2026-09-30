package de.gassi.controller;

import de.gassi.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

public class GlobalExceptionHandlerTest extends AbstractIntegrationTest {

    @Test
    void fehlendeStatischeRessourceBekommt404() throws Exception {
        mvc.perform(get("/gibt-es-nicht.png"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("RESSOURCE_NICHT_GEFUNDEN"));
    }

    @Test
    void clientAbbruchFuehrtZuKeinemAntwortversuch() {
        org.apache.catalina.connector.ClientAbortException abbruch =
            new org.apache.catalina.connector.ClientAbortException(new java.io.IOException("Broken pipe"));
        de.gassi.exception.GlobalExceptionHandler handler = new de.gassi.exception.GlobalExceptionHandler();
        org.junit.jupiter.api.Assertions.assertNull(handler.handleAll(abbruch));
    }
}
