package de.gassi.service;

import de.gassi.domain.Rolle;
import de.gassi.domain.Teammitglied;
import de.gassi.exception.BusinessFehler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TeamZugriffsPruefer {

    private final AktuellerNutzerService aktuellerNutzerService;

    public Teammitglied aktuellesMitglied() {
        return aktuellerNutzerService.aktuellesMitglied();
    }

    public Teammitglied pruefeZugriff(Long teamId) {
        Teammitglied nutzer = aktuellerNutzerService.aktuellesMitglied();
        if (nutzer.getRolle() == Rolle.SUPER_ADMIN) {
            return nutzer;
        }
        if (nutzer.getTeam() == null || !nutzer.getTeam().getId().equals(teamId)) {
            throw new BusinessFehler("KEIN_TEAMZUGRIFF", "Du hast keinen Zugriff auf dieses Team.");
        }
        return nutzer;
    }

    public Teammitglied pruefeAdminZugriff(Long teamId) {
        Teammitglied nutzer = pruefeZugriff(teamId);
        if (nutzer.getRolle() == Rolle.MITGLIED) {
            throw new BusinessFehler("KEINE_BERECHTIGUNG", "Nur Admins dürfen das.");
        }
        return nutzer;
    }
}
