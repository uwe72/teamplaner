package de.gassi.service;

import de.gassi.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class KonfigurationsService {

    public static final String SMTP_HOST = "SMTP_HOST";
    public static final String SMTP_PORT = "SMTP_PORT";
    public static final String SMTP_BENUTZER = "SMTP_BENUTZER";
    public static final String SMTP_PASSWORT = "SMTP_PASSWORT";
    public static final String SMTP_ABSENDER = "SMTP_ABSENDER";
    public static final String WEB_URL = "WEB_URL";

    public static final java.util.List<String> SCHLUESSEL =
        java.util.List.of(SMTP_HOST, SMTP_PORT, SMTP_BENUTZER, SMTP_PASSWORT, SMTP_ABSENDER, WEB_URL);

    private final SystemConfigRepository systemConfigRepository;

    @Transactional(readOnly = true)
    public String wert(String schluessel, String standard) {
        return systemConfigRepository.findBySchluessel(schluessel)
            .map(c -> c.getWert())
            .filter(w -> w != null && !w.isBlank())
            .orElse(standard);
    }

    @Transactional(readOnly = true)
    public Map<String, String> alle() {
        Map<String, String> result = new HashMap<>();
        for (String schluessel : SCHLUESSEL) {
            result.put(schluessel,
                systemConfigRepository.findBySchluessel(schluessel).map(c -> c.getWert() == null ? "" : c.getWert())
                    .orElse(""));
        }
        return result;
    }

    @Transactional
    public void setzen(Map<String, String> werte) {
        for (String schluessel : SCHLUESSEL) {
            String wert = werte.get(schluessel);
            if (wert == null) {
                continue;
            }
            de.gassi.domain.SystemConfig config = systemConfigRepository.findBySchluessel(schluessel)
                .orElseGet(() -> de.gassi.domain.SystemConfig.builder().schluessel(schluessel).build());
            config.setWert(wert);
            systemConfigRepository.save(config);
        }
    }
}
