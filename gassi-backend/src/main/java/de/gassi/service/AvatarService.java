package de.gassi.service;

import de.gassi.domain.Teammitglied;
import de.gassi.exception.BusinessFehler;
import de.gassi.repository.TeammitgliedRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AvatarService {

    private static final long MAX_BYTES = 2 * 1024 * 1024;
    private static final Set<String> ERLAUBTE_TYPEN = Set.of("image/jpeg", "image/png", "image/webp");

    private final TeammitgliedRepository teammitgliedRepository;
    private final TeamZugriffsPruefer zugriffsPruefer;

    @Transactional
    public Teammitglied eigenesHochladen(MultipartFile file) {
        Teammitglied nutzer = zugriffsPruefer.aktuellesMitglied();
        return setzen(nutzer, file);
    }

    @Transactional
    public void eigenesLoeschen() {
        Teammitglied nutzer = zugriffsPruefer.aktuellesMitglied();
        nutzer.setAvatar(null);
        nutzer.setAvatarContentType(null);
        teammitgliedRepository.save(nutzer);
    }

    @Transactional(readOnly = true)
    public Optional<Bild> eigenesLaden() {
        Teammitglied nutzer = zugriffsPruefer.aktuellesMitglied();
        return lesen(nutzer);
    }

    @Transactional
    public Teammitglied hochladen(Long teamId, Long mitgliedId, MultipartFile file) {
        zugriffsPruefer.pruefeAdminZugriff(teamId);
        return setzen(zielHolen(teamId, mitgliedId), file);
    }

    @Transactional
    public void loeschen(Long teamId, Long mitgliedId) {
        zugriffsPruefer.pruefeAdminZugriff(teamId);
        Teammitglied ziel = zielHolen(teamId, mitgliedId);
        ziel.setAvatar(null);
        ziel.setAvatarContentType(null);
        teammitgliedRepository.save(ziel);
    }

    @Transactional(readOnly = true)
    public Optional<Bild> laden(Long teamId, Long mitgliedId) {
        zugriffsPruefer.pruefeZugriff(teamId);
        return lesen(zielHolen(teamId, mitgliedId));
    }

    private Teammitglied zielHolen(Long teamId, Long mitgliedId) {
        Teammitglied ziel = teammitgliedRepository.findById(mitgliedId)
            .filter(m -> m.getTeam() != null && m.getTeam().getId().equals(teamId))
            .orElseThrow(() -> new BusinessFehler("MITGLIED_UNBEKANNT", "Dieses Teammitglied existiert nicht."));
        return ziel;
    }

    private Teammitglied setzen(Teammitglied ziel, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessFehler("BILD_FEHLT", "Es wurde kein Bild übergeben.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ERLAUBTE_TYPEN.contains(contentType)) {
            throw new BusinessFehler("BILD_TYP_UNGUELTIG", "Nur JPG, PNG und WebP Bilder sind erlaubt.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BusinessFehler("BILD_ZU_GROSS", "Bild darf maximal 2 MB groß sein.");
        }
        try {
            ziel.setAvatar(file.getBytes());
        } catch (Exception e) {
            throw new BusinessFehler("BILD_UNLESBAR", "Das Bild konnte nicht gelesen werden.");
        }
        ziel.setAvatarContentType(contentType);
        return teammitgliedRepository.save(ziel);
    }

    private Optional<Bild> lesen(Teammitglied ziel) {
        if (ziel.getAvatar() == null || ziel.getAvatar().length == 0) {
            return Optional.empty();
        }
        return Optional.of(new Bild(ziel.getAvatar(), ziel.getAvatarContentType()));
    }

    public static String avatarUrlFuer(Long teamId, Long mitgliedId, boolean hatAvatar) {
        if (!hatAvatar || teamId == null || mitgliedId == null) {
            return null;
        }
        return "/api/teams/" + teamId + "/mitglieder/" + mitgliedId + "/avatar";
    }

    public record Bild(byte[] daten, String contentType) {
    }
}
