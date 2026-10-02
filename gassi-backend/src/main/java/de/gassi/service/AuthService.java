package de.gassi.service;

import de.gassi.config.JwtTokenProvider;
import de.gassi.domain.Bereich;
import de.gassi.domain.Rolle;
import de.gassi.domain.Team;
import de.gassi.domain.Teammitglied;
import de.gassi.dto.AuthAntwort;
import de.gassi.dto.KontoAnlegenAnfrage;
import de.gassi.dto.LoginAnfrage;
import de.gassi.dto.ProfilDto;
import de.gassi.dto.ProfilAendernAnfrage;
import de.gassi.dto.TeamAnlegenAnfrage;
import de.gassi.exception.BusinessFehler;
import de.gassi.repository.BereichRepository;
import de.gassi.repository.TeamRepository;
import de.gassi.repository.TeammitgliedRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final TeammitgliedRepository teammitgliedRepository;
    private final TeamRepository teamRepository;
    private final BereichRepository bereichRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AktuellerNutzerService aktuellerNutzerService;
    private final ZeitService zeitService;

    @Transactional
    public AuthAntwort kontoAnlegen(KontoAnlegenAnfrage anfrage) {
        String login = anfrage.login().trim();
        pruefeLoginFormat(login);
        if (teammitgliedRepository.existsByLoginIgnoreCase(login)) {
            throw new BusinessFehler("LOGINNAME_BELEGT", "Dieser Loginname ist bereits vergeben.");
        }
        String email = anfrage.email().trim();
        String passwort = anfrage.passwort();

        boolean ersteRegistrierung = !teammitgliedRepository.existsByRolle(Rolle.SUPER_ADMIN);
        Rolle rolle = ersteRegistrierung ? Rolle.SUPER_ADMIN : Rolle.ADMIN;

        Teammitglied mitglied = Teammitglied.builder()
            .login(login)
            .email(email)
            .passwortHash(passwordEncoder.encode(passwort))
            .anzeigename(login)
            .rolle(rolle)
            .aktiv(true)
            .build();
        mitglied = teammitgliedRepository.save(mitglied);

        return antwortFuer(mitglied);
    }

    @Transactional
    public AuthAntwort teamAnlegen(TeamAnlegenAnfrage anfrage) {
        Teammitglied nutzer = aktuellerNutzerService.aktuellesMitglied();
        if (nutzer.getRolle() == Rolle.SUPER_ADMIN) {
            throw new BusinessFehler("TEAM_NICHT_MOEGLICH",
                "Der Plattform-Admin hat kein eigenes Team und kann kein Team für sich anlegen.");
        }
        if (nutzer.getTeam() != null) {
            throw new BusinessFehler("TEAM_BEREITS_VORHANDEN", "Dein Account gehört bereits zu einem Team.");
        }
        String teamName = anfrage.teamName().trim();
        if (teamRepository.existsByNameIgnoreCase(teamName)) {
            throw new BusinessFehler("TEAMNAME_BELEGT", "Dieser Teamname ist bereits vergeben.");
        }

        Team team = Team.builder()
            .name(teamName)
            .aktiv(true)
            .erstelltAm(zeitService.jetzt())
            .build();
        team = teamRepository.save(team);

        nutzer.setTeam(team);
        nutzer = teammitgliedRepository.save(nutzer);

        Bereich startbereich = Bereich.builder()
            .team(team)
            .name("Bereich 1")
            .aktiv(true)
            .position(0)
            .build();
        bereichRepository.save(startbereich);

        return antwortFuer(nutzer);
    }

    @Transactional(readOnly = true)
    public AuthAntwort login(LoginAnfrage anfrage) {
        Optional<Teammitglied> gefunden = teammitgliedRepository.findByLoginIgnoreCase(anfrage.login().trim());
        Teammitglied mitglied = gefunden
            .filter(m -> m.isAktiv())
            .filter(m -> passwordEncoder.matches(anfrage.passwort(), m.getPasswortHash()))
            .orElseThrow(() -> new BusinessFehler("LOGIN_FEHLGESCHLAGEN", "Loginname oder Passwort ist falsch."));
        return antwortFuer(mitglied);
    }

    @Transactional(readOnly = true)
    public AuthAntwort refresh(String refreshToken) {
        var claims = jwtTokenProvider.leseClaims(refreshToken)
            .filter(c -> jwtTokenProvider.istRefreshToken(c))
            .orElseThrow(() -> new BusinessFehler("SITZUNG_ABGELAUFEN", "Bitte neu anmelden."));
        Teammitglied mitglied = teammitgliedRepository.findById(jwtTokenProvider.mitgliedIdAus(claims))
            .filter(Teammitglied::isAktiv)
            .orElseThrow(() -> new BusinessFehler("LOGIN_FEHLGESCHLAGEN", "Loginname oder Passwort ist falsch."));
        return antwortFuer(mitglied);
    }

    @Transactional(readOnly = true)
    public boolean loginVerfuegbar(String login) {
        return !teammitgliedRepository.existsByLoginIgnoreCase(login.trim());
    }

    @Transactional
    public ProfilDto passwortAendern(String altesPasswort, String neuesPasswort) {
        Teammitglied nutzer = aktuellerNutzerService.aktuellesMitglied();
        if (!passwordEncoder.matches(altesPasswort, nutzer.getPasswortHash())) {
            throw new BusinessFehler("PASSWORT_FALSCH", "Das alte Passwort ist falsch.");
        }
        nutzer.setPasswortHash(passwordEncoder.encode(neuesPasswort));
        teammitgliedRepository.save(nutzer);
        return profil(nutzer.getId());
    }

    @Transactional
    public ProfilDto profilAendern(ProfilAendernAnfrage anfrage) {
        Teammitglied nutzer = aktuellerNutzerService.aktuellesMitglied();
        nutzer.setAnzeigename(anfrage.anzeigename().trim());
        teammitgliedRepository.save(nutzer);
        return profil(nutzer.getId());
    }

    @Transactional(readOnly = true)
    public ProfilDto profil(Long mitgliedId) {
        Teammitglied nutzer = aktuellerNutzerService.aktuellesMitglied();
        boolean fremd = mitgliedId != null && !nutzer.getId().equals(mitgliedId);
        if (fremd && nutzer.getRolle() == Rolle.MITGLIED) {
            throw new BusinessFehler("KEINE_BERECHTIGUNG", "Nur dein eigenes Profil.");
        }
        return new ProfilDto(nutzer.getId(), nutzer.getLogin(), nutzer.getEmail(), nutzer.getAnzeigename(),
            nutzer.getRolle().name(),
            nutzer.getTeam() == null ? null : nutzer.getTeam().getId(),
            nutzer.getTeam() == null ? null : nutzer.getTeam().getName(),
            hatAvatar(nutzer) ? "/api/auth/me/avatar" : null);
    }

    public static boolean hatAvatar(Teammitglied m) {
        return m.getAvatar() != null && m.getAvatar().length > 0;
    }

    private void pruefeLoginFormat(String login) {
        if (login.isBlank()) {
            throw new BusinessFehler("LOGIN_UNGUELTIG", "Der Loginname darf nicht leer sein.");
        }
        if (login.contains("@")) {
            throw new BusinessFehler("LOGIN_IST_EMAIL", "Der Loginname darf keine E-Mail-Adresse sein.");
        }
        if (login.length() > 25) {
            throw new BusinessFehler("LOGIN_ZU_LANG", "Der Loginname darf höchstens 25 Zeichen lang sein.");
        }
    }

    private AuthAntwort antwortFuer(Teammitglied mitglied) {
        Long teamId = mitglied.getTeam() == null ? null : mitglied.getTeam().getId();
        String teamName = mitglied.getTeam() == null ? null : mitglied.getTeam().getName();
        String token = jwtTokenProvider.erzeugeAccessToken(mitglied.getId(), mitglied.getLogin(),
            mitglied.getRolle().name(), teamId);
        String refreshToken = jwtTokenProvider.erzeugeRefreshToken(mitglied.getId(), mitglied.getLogin(),
            mitglied.getRolle().name(), teamId);
        boolean teamOeffen = mitglied.getRolle() == Rolle.ADMIN && teamId == null;
        return new AuthAntwort(token, refreshToken, mitglied.getId(), mitglied.getLogin(), mitglied.getAnzeigename(),
            mitglied.getRolle().name(), teamId, teamName, teamOeffen,
            hatAvatar(mitglied) ? "/api/auth/me/avatar" : null);
    }
}
