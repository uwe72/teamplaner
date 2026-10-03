package de.gassi.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class HaToken {

    private String token;

    public HaToken(@Value("${app.ha.token:}") String token) {
        this.token = token == null ? "" : token.trim();
    }

    public boolean aktiv() {
        return !token.isEmpty();
    }

    public boolean stimmt(String kandidat) {
        if (!aktiv() || kandidat == null) {
            return false;
        }
        return MessageDigest.isEqual(
            token.getBytes(StandardCharsets.UTF_8),
            kandidat.trim().getBytes(StandardCharsets.UTF_8));
    }
}
