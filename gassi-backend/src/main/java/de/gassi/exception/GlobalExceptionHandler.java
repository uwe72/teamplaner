package de.gassi.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

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

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidierung(MethodArgumentNotValidException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(Map.of("code", "ANFRAGE_UNGUELTIG", "message", "Die Anfrage enthält ungültige Werte."));
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<Map<String, String>> handleMissingPart(MissingServletRequestPartException e) {
        boolean bild = e.getRequestPartName() != null && e.getRequestPartName().equals("file");
        String code = bild ? "BILD_FEHLT" : "ANFRAGE_UNVOLLSTAENDIG";
        String message = bild ? "Es wurde kein Bild übergeben." : "Die Anfrage ist unvollständig.";
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("code", code, "message", message));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, String>> handleNoResourceFound(NoResourceFoundException e) {
        log.debug("Ressource nicht gefunden: {}", e.getResourcePath());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("code", "RESSOURCE_NICHT_GEFUNDEN", "message", "Ressource nicht gefunden."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleAll(Exception e) {
        if (istClientAbbruch(e)) {
            return null;
        }
        log.error("Unbehandelter Fehler: {}", anfrageBeschreibung(), e);
        return ResponseEntity.internalServerError().body(Map.of("code", "UNBEKANNTER_FEHLER", "message", e.getMessage()));
    }

    private boolean istClientAbbruch(Throwable e) {
        Throwable t = e;
        while (t != null) {
            String name = t.getClass().getName();
            if (name.equals("org.apache.catalina.connector.ClientAbortException")
                || name.equals("org.springframework.web.context.request.async.AsyncRequestNotUsableException")) {
                return true;
            }
            String message = t.getMessage();
            if (message != null) {
                String m = message.toLowerCase();
                if (m.contains("broken pipe") || m.contains("connection reset")
                    || m.contains("client aborted") || m.contains("aborted connection")) {
                    return true;
                }
            }
            t = t.getCause();
        }
        return false;
    }

    private String anfrageBeschreibung() {
        if (RequestContextHolder.getRequestAttributes()
            instanceof ServletRequestAttributes attribute) {
            HttpServletRequest request = attribute.getRequest();
            return request.getMethod() + " " + request.getRequestURI();
        }
        return "";
    }
}
