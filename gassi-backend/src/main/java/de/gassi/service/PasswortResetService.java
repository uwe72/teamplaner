package de.gassi.service;

import de.gassi.domain.PasswortResetToken;
import de.gassi.domain.Teammitglied;
import de.gassi.dto.PasswortVergessenAntwortDto;
import de.gassi.repository.PasswortResetTokenRepository;
import de.gassi.repository.TeammitgliedRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PasswortResetService {

    private static final int TOKEN_GUELTIG_MINUTEN = 30;

    private final TeammitgliedRepository teammitgliedRepository;
    private final PasswortResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final KonfigurationsService konfigurationsService;
    private final ZeitService zeitService;

    @Transactional
    public PasswortVergessenAntwortDto anfordern(String email, String loginWunsch) {
        List<Teammitglied> treffer = teammitgliedRepository.findAllByEmailIgnoreCase(email.trim());
        Teammitglied ziel = null;
        if (loginWunsch != null && !loginWunsch.isBlank()) {
            ziel = treffer.stream()
                .filter(m -> m.getLogin().equalsIgnoreCase(loginWunsch.trim()))
                .findFirst()
                .orElse(null);
        } else if (treffer.size() == 1) {
            ziel = treffer.get(0);
        }

        if (ziel != null) {
            tokenRepository.deleteByMitgliedId(ziel.getId());
            PasswortResetToken token = PasswortResetToken.builder()
                .token(UUID.randomUUID().toString())
                .mitglied(ziel)
                .ablauf(zeitService.jetzt().plusMinutes(TOKEN_GUELTIG_MINUTEN))
                .benutzt(false)
                .build();
            tokenRepository.save(token);
            String webUrl = konfigurationsService.wert(KonfigurationsService.WEB_URL, "http://localhost:5173");
            String link = webUrl + "/passwort-zuruecksetzen?token=" + token.getToken();
            mailService.sendeMail(ziel.getEmail(), "Teamplaner | Passwort zurücksetzen",
                resetMail(ziel.getAnzeigename(), link, TOKEN_GUELTIG_MINUTEN));
            return new PasswortVergessenAntwortDto(treffer.size() > 1,
                treffer.stream().map(Teammitglied::getLogin).toList());
        }

        return new PasswortVergessenAntwortDto(treffer.size() > 1,
            treffer.stream().map(Teammitglied::getLogin).toList());
    }

    @Transactional
    public void zuruecksetzen(String token, String neuesPasswort) {
        PasswortResetToken reset = tokenRepository.findByToken(token)
            .orElseThrow(() -> new de.gassi.exception.BusinessFehler("RESET_TOKEN_UNGUELTIG",
                "Der Link ist ungültig oder abgelaufen."));
        if (reset.isBenutzt() || reset.getAblauf().isBefore(zeitService.jetzt())) {
            throw new de.gassi.exception.BusinessFehler("RESET_TOKEN_UNGUELTIG",
                "Der Link ist ungültig oder abgelaufen.");
        }
        Teammitglied mitglied = reset.getMitglied();
        mitglied.setPasswortHash(passwordEncoder.encode(neuesPasswort));
        teammitgliedRepository.save(mitglied);
        reset.setBenutzt(true);
        tokenRepository.save(reset);
    }

    @Transactional
    public void loginnamenAnfordern(String email) {
        List<Teammitglied> treffer = teammitgliedRepository.findAllByEmailIgnoreCase(email.trim());
        if (treffer.isEmpty()) {
            return;
        }
        String logins = treffer.stream().map(Teammitglied::getLogin).reduce((a, b) -> a + ", " + b).orElse("");
        mailService.sendeMail(treffer.get(0).getEmail(), "Teamplaner | Deine Login-Namen",
            loginReminderMail(logins));
    }

    private String resetMail(String name, String link, int gueltigMinuten) {
        return """
            <div style="font-family:sans-serif;max-width:480px">
              <h2>Passwort zurücksetzen</h2>
              <p>Hallo %s,</p>
              <p>mit diesem Link kannst du dein Passwort neu setzen (gültig für %d Minuten):</p>
              <p><a href="%s" style="background:#3f3a34;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Passwort zurücksetzen</a></p>
              <p>Falls du das nicht angefordert hast, kannst du diese Mail ignorieren.</p>
            </div>
            """.formatted(name, gueltigMinuten, link);
    }

    private String loginReminderMail(String logins) {
        return """
            <div style="font-family:sans-serif;max-width:480px">
              <h2>Deine Login-Namen</h2>
              <p>Du hast mit dieser E-Mail folgende Logins:</p>
              <p style="font-size:18px"><b>%s</b></p>
              <p><a href="%s/login">Zur Anmeldung</a></p>
            </div>
            """.formatted(logins, konfigurationsService.wert(KonfigurationsService.WEB_URL, "http://localhost:5173"));
    }
}
