package de.gassi.controller;

import de.gassi.dto.HaPlanDto;
import de.gassi.service.AvatarService;
import de.gassi.service.HaPlanService;
import de.gassi.service.HaToken;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/ha")
@RequiredArgsConstructor
public class HaController {

    private final HaToken haToken;
    private final HaPlanService haPlanService;

    @GetMapping("/plan/{bereichId}")
    public ResponseEntity<?> plan(@PathVariable Long bereichId,
                                  @RequestHeader(value = "X-HA-Token", required = false) String token) {
        if (!haToken.aktiv()) {
            return nichtGefunden();
        }
        if (!haToken.stimmt(token)) {
            return unautorisiert();
        }
        HaPlanDto plan = haPlanService.plan(bereichId);
        if (plan == null) {
            return nichtGefunden();
        }
        return ResponseEntity.ok(plan);
    }

    @GetMapping("/foto/{mitgliedId}")
    public ResponseEntity<byte[]> foto(@PathVariable Long mitgliedId,
                                       @RequestParam(value = "k", required = false) String token) {
        if (!haToken.aktiv()) {
            return ResponseEntity.notFound().build();
        }
        if (!haToken.stimmt(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .contentType(MediaType.APPLICATION_JSON)
                .body(fehlerBytes());
        }
        Optional<AvatarService.Bild> bild = haPlanService.foto(mitgliedId);
        if (bild.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
            .header(HttpHeaders.CACHE_CONTROL, "max-age=86400")
            .contentType(MediaType.parseMediaType(bild.get().contentType()))
            .body(bild.get().daten());
    }

    private ResponseEntity<Map<String, String>> nichtGefunden() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("code", "HA_DEAKTIVIERT", "message", "Der Home-Assistant-Endpunkt ist deaktiviert."));
    }

    private ResponseEntity<Map<String, String>> unautorisiert() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("code", "HA_TOKEN_UNGUELTIG", "message", "Token fehlt oder ist ungueltig."));
    }

    private byte[] fehlerBytes() {
        return "{\"code\":\"HA_TOKEN_UNGUELTIG\",\"message\":\"Token fehlt oder ist ungueltig.\"}"
            .getBytes(StandardCharsets.UTF_8);
    }
}
