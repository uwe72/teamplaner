package de.gassi.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Date;
import java.util.Optional;

@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    public static final Duration ACCESS_DAUER = Duration.ofHours(1);
    public static final Duration REFRESH_DAUER = Duration.ofDays(30);

    @Value("${app.jwt.secret:}")
    private String secretKonfiguration;

    private SecretKey geheimerSchluessel;

    @PostConstruct
    void initialisiere() {
        if (secretKonfiguration == null || secretKonfiguration.isBlank()) {
            byte[] zufall = new byte[48];
            new SecureRandom().nextBytes(zufall);
            geheimerSchluessel = Keys.hmacShaKeyFor(zufall);
            log.warn("APP_JWT_SECRET nicht gesetzt — es wird ein temporärer Zufalls-Schlüssel "
                + "verwendet (Tokens verfallen beim Neustart). Für Produktion APP_JWT_SECRET setzen (mind. 32 Byte).");
        } else {
            if (secretKonfiguration.getBytes().length < 32) {
                throw new IllegalStateException("APP_JWT_SECRET muss mindestens 32 Byte lang sein.");
            }
            geheimerSchluessel = Keys.hmacShaKeyFor(secretKonfiguration.getBytes());
        }
    }

    public String erzeugeAccessToken(Long mitgliedId, String login, String rolle, Long teamId) {
        return erzeugeToken(mitgliedId, login, rolle, teamId, "access", ACCESS_DAUER);
    }

    public String erzeugeRefreshToken(Long mitgliedId, String login, String rolle, Long teamId) {
        return erzeugeToken(mitgliedId, login, rolle, teamId, "refresh", REFRESH_DAUER);
    }

    private String erzeugeToken(Long mitgliedId, String login, String rolle, Long teamId, String typ, Duration dauer) {
        var builder = Jwts.builder()
            .subject(String.valueOf(mitgliedId))
            .claim("login", login)
            .claim("rolle", rolle)
            .claim("typ", typ)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + dauer.toMillis()))
            .signWith(geheimerSchluessel, SignatureAlgorithm.HS256);
        if (teamId != null) {
            builder.claim("teamId", teamId);
        }
        return builder.compact();
    }

    public Optional<Claims> leseClaims(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(geheimerSchluessel)
                .build()
                .parseSignedClaims(token)
                .getPayload();
            return Optional.of(claims);
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public Long mitgliedIdAus(Claims claims) {
        return Long.valueOf(claims.getSubject());
    }

    public String rolleAus(Claims claims) {
        return claims.get("rolle", String.class);
    }

    public String loginAus(Claims claims) {
        return claims.get("login", String.class);
    }

    public Long teamIdAus(Claims claims) {
        Object teamId = claims.get("teamId");
        return teamId == null ? null : Long.valueOf(teamId.toString());
    }

    public boolean istRefreshToken(Claims claims) {
        return "refresh".equals(claims.get("typ", String.class));
    }
}
