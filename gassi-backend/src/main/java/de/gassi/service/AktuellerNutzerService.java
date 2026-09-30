package de.gassi.service;

import de.gassi.domain.Teammitglied;
import de.gassi.exception.BusinessFehler;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AktuellerNutzerService {

    public Teammitglied aktuellesMitglied() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof Teammitglied mitglied) {
            return mitglied;
        }
        throw new BusinessFehler("NICHT_ANGEMELDET", "Anmeldung erforderlich.");
    }
}
