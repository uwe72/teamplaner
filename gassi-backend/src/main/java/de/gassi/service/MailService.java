package de.gassi.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
@Slf4j
@RequiredArgsConstructor
public class MailService {

    private final KonfigurationsService konfigurationsService;

    @Async
    public void sendeMail(String an, String betreff, String htmlInhalt) {
        String host = konfigurationsService.wert(KonfigurationsService.SMTP_HOST, "");
        String port = konfigurationsService.wert(KonfigurationsService.SMTP_PORT, "587");
        String benutzer = konfigurationsService.wert(KonfigurationsService.SMTP_BENUTZER, "");
        String passwort = konfigurationsService.wert(KonfigurationsService.SMTP_PASSWORT, "");
        String absender = konfigurationsService.wert(KonfigurationsService.SMTP_ABSENDER, benutzer);

        if (host.isBlank() || benutzer.isBlank() || absender.isBlank()) {
            log.warn("SMTP nicht konfiguriert (Super-Admin → Systemkonfiguration) — Mail an {} wurde nicht gesendet.", an);
            return;
        }

        try {
            JavaMailSenderImpl sender = new JavaMailSenderImpl();
            sender.setHost(host);
            sender.setPort(Integer.parseInt(port));
            sender.setUsername(benutzer);
            sender.setPassword(passwort);
            var props = sender.getJavaMailProperties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");

            MimeMessage nachricht = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(nachricht, true, "UTF-8");
            helper.setFrom(absender);
            helper.setTo(an);
            helper.setSubject(betreff);
            helper.setText(htmlInhalt, true);
            sender.send(nachricht);
            log.info("Mail an {} gesendet (Betreff: {}).", an, betreff);
        } catch (Exception e) {
            log.error("Mail-Versand an {} fehlgeschlagen: {}", an, e.getMessage());
        }
    }
}
