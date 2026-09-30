package de.gassi.controller;

import de.gassi.config.JwtTokenProvider;
import de.gassi.dto.AuthAntwort;
import de.gassi.dto.CheckLoginDto;
import de.gassi.dto.KontoAnlegenAnfrage;
import de.gassi.dto.LoginAnfrage;
import de.gassi.dto.LoginnameVergessenAnfrage;
import de.gassi.dto.PasswortAendernAnfrage;
import de.gassi.dto.PasswortVergessenAnfrage;
import de.gassi.dto.PasswortVergessenAntwortDto;
import de.gassi.dto.PasswortZuruecksetzenAnfrage;
import de.gassi.dto.ProfilAendernAnfrage;
import de.gassi.dto.ProfilDto;
import de.gassi.dto.TeamAnlegenAnfrage;
import de.gassi.service.AuthService;
import de.gassi.service.PasswortResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswortResetService passwortResetService;
    private final JwtTokenProvider jwtTokenProvider;

    @GetMapping("/check-login")
    public CheckLoginDto checkLogin(@RequestParam String login) {
        return new CheckLoginDto(authService.loginVerfuegbar(login));
    }

    @PostMapping("/registrieren")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthAntwort registrieren(@Valid @RequestBody KontoAnlegenAnfrage anfrage) {
        return authService.kontoAnlegen(anfrage);
    }

    @PostMapping("/team")
    public AuthAntwort teamAnlegen(@Valid @RequestBody TeamAnlegenAnfrage anfrage) {
        return authService.teamAnlegen(anfrage);
    }

    @PostMapping("/login")
    public AuthAntwort login(@Valid @RequestBody LoginAnfrage anfrage) {
        return authService.login(anfrage);
    }

    @PostMapping("/refresh")
    public AuthAntwort refresh(@RequestBody Map<String, String> body) {
        return authService.refresh(body.get("refreshToken"));
    }

    @PostMapping("/passwort-vergessen")
    public PasswortVergessenAntwortDto passwortVergessen(@Valid @RequestBody PasswortVergessenAnfrage anfrage) {
        return passwortResetService.anfordern(anfrage.email(), anfrage.login());
    }

    @PostMapping("/passwort-zuruecksetzen")
    public Map<String, String> passwortZuruecksetzen(@Valid @RequestBody PasswortZuruecksetzenAnfrage anfrage) {
        passwortResetService.zuruecksetzen(anfrage.token(), anfrage.neuesPasswort());
        return Map.of("meldung", "Passwort wurde gesetzt — du kannst dich jetzt anmelden.");
    }

    @PostMapping("/loginname-vergessen")
    public Map<String, String> loginnameVergessen(@Valid @RequestBody LoginnameVergessenAnfrage anfrage) {
        passwortResetService.loginnamenAnfordern(anfrage.email());
        return Map.of("meldung", "Wenn zur E-Mail Logins existieren, haben wir sie per Mail geschickt.");
    }

    @PutMapping("/passwort")
    public ProfilDto passwortAendern(@Valid @RequestBody PasswortAendernAnfrage anfrage) {
        return authService.passwortAendern(anfrage.altesPasswort(), anfrage.neuesPasswort());
    }

    @PutMapping("/profil")
    public ProfilDto profilAendern(@Valid @RequestBody ProfilAendernAnfrage anfrage) {
        return authService.profilAendern(anfrage);
    }

    @GetMapping("/profil")
    public ProfilDto profil() {
        return authService.profil(null);
    }
}
