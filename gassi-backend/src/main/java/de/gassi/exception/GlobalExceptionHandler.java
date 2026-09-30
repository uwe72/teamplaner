package de.gassi.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(Map.of("code", "KEINE_BERECHTIGUNG", "message", "Keine Berechtigung."));
    }

    @ExceptionHandler(BusinessFehler.class)
    public ResponseEntity<Map<String, String>> handleBusinessFehler(BusinessFehler e) {
        HttpStatus status = switch (e.getCode()) {
            case "NICHT_ANGEMELDET" -> HttpStatus.UNAUTHORIZED;
            case "KEINE_BERECHTIGUNG", "KEIN_TEAMZUGRIFF" -> HttpStatus.FORBIDDEN;
            case "ZUTEILUNG_KONFLIKT", "VERGANGENHEIT_GESPERRT", "LOGIN_FEHLGESCHLAGEN",
                 "RESET_TOKEN_UNGUELTIG" -> HttpStatus.CONFLICT;
            default -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status).body(Map.of("code", e.getCode(), "message", e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleAll(Exception e) {
        return ResponseEntity.internalServerError()            .body(Map.of("code", "UNBEKANNTER_FEHLER", "message", e.getMessage()));
    }
}
