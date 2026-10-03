package de.gassi.controller;

import de.gassi.dto.AufgabeAendernAnfrage;
import de.gassi.dto.AufgabeAnlegenAnfrage;
import de.gassi.dto.AufgabeDto;
import de.gassi.dto.BereichAendernAnfrage;
import de.gassi.dto.BereichAnlegenAnfrage;
import de.gassi.dto.BereichDto;
import de.gassi.dto.MitgliedAendernAnfrage;
import de.gassi.dto.MitgliedAnlegenAnfrage;
import de.gassi.dto.MitgliedDto;
import de.gassi.dto.PlanDto;
import de.gassi.dto.SollAendernAnfrage;
import de.gassi.dto.SollListeDto;
import de.gassi.dto.StatistikDto;
import de.gassi.dto.ZeitfensterAendernAnfrage;
import de.gassi.dto.ZeitfensterAnlegenAnfrage;
import de.gassi.dto.ZeitfensterDto;
import de.gassi.dto.ZuteilungAnlegenAnfrage;
import de.gassi.dto.ZuteilungDto;
import de.gassi.dto.ZeitfensterZuteilungAnlegenAnfrage;
import de.gassi.service.AvatarService;
import de.gassi.service.PlanService;
import de.gassi.service.StatistikService;
import de.gassi.service.StammdatenService;
import de.gassi.service.ZuteilungService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/teams/{teamId}")
@RequiredArgsConstructor
public class TeamController {

    private final PlanService planService;
    private final ZuteilungService zuteilungService;
    private final StammdatenService stammdatenService;
    private final StatistikService statistikService;
    private final AvatarService avatarService;

    @GetMapping("/plan")
    public PlanDto wochenplan(@PathVariable Long teamId,
                              @RequestParam Long bereichId,
                              @RequestParam int isoJahr,
                              @RequestParam int isoWoche) {
        return planService.wochenplan(teamId, bereichId, isoJahr, isoWoche);
    }

    @PostMapping("/zuteilungen")
    @ResponseStatus(HttpStatus.CREATED)
    public ZuteilungDto zuweisen(@PathVariable Long teamId,
                                 @Valid @RequestBody ZuteilungAnlegenAnfrage anfrage) {
        return zuteilungService.zuweisen(teamId, anfrage);
    }

    @PostMapping("/zeitfenster/{zeitfensterId}/zuteilungen")
    @ResponseStatus(HttpStatus.CREATED)
    public List<ZuteilungDto> zeitfensterZuweisen(@PathVariable Long teamId,
                                                  @PathVariable Long zeitfensterId,
                                                  @Valid @RequestBody ZeitfensterZuteilungAnlegenAnfrage anfrage) {
        return zuteilungService.zeitfensterZuweisen(teamId, zeitfensterId, anfrage);
    }

    @DeleteMapping("/zuteilungen/{zuteilungId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void loeschen(@PathVariable Long teamId, @PathVariable Long zuteilungId) {
        zuteilungService.loeschen(teamId, zuteilungId);
    }

    @GetMapping("/bereiche")
    public List<BereichDto> bereiche(@PathVariable Long teamId,
                                     @RequestParam(required = false, defaultValue = "false") boolean alle) {
        return stammdatenService.bereiche(teamId, alle);
    }

    @PostMapping("/bereiche")
    @ResponseStatus(HttpStatus.CREATED)
    public BereichDto bereichAnlegen(@PathVariable Long teamId, @Valid @RequestBody BereichAnlegenAnfrage anfrage) {
        return stammdatenService.bereichAnlegen(teamId, anfrage);
    }

    @PutMapping("/bereiche/{bereichId}")
    public BereichDto bereichAendern(@PathVariable Long teamId, @PathVariable Long bereichId,
                                     @RequestBody BereichAendernAnfrage anfrage) {
        return stammdatenService.bereichAendern(teamId, bereichId, anfrage);
    }

    @GetMapping("/bereiche/{bereichId}/zeitfenster")
    public List<ZeitfensterDto> zeitfenster(@PathVariable Long teamId, @PathVariable Long bereichId,
                                            @RequestParam(required = false, defaultValue = "false") boolean alle) {
        return stammdatenService.zeitfenster(teamId, bereichId, alle);
    }

    @PostMapping("/bereiche/{bereichId}/zeitfenster")
    @ResponseStatus(HttpStatus.CREATED)
    public ZeitfensterDto zeitfensterAnlegen(@PathVariable Long teamId, @PathVariable Long bereichId,
                                             @Valid @RequestBody ZeitfensterAnlegenAnfrage anfrage) {
        return stammdatenService.zeitfensterAnlegen(teamId, bereichId, anfrage);
    }

    @PutMapping("/bereiche/{bereichId}/zeitfenster/{zeitfensterId}")
    public ZeitfensterDto zeitfensterAendern(@PathVariable Long teamId, @PathVariable Long bereichId,
                                             @PathVariable Long zeitfensterId,
                                             @RequestBody ZeitfensterAendernAnfrage anfrage) {
        return stammdatenService.zeitfensterAendern(teamId, bereichId, zeitfensterId, anfrage);
    }

    @GetMapping("/bereiche/{bereichId}/aufgaben")
    public List<AufgabeDto> aufgaben(@PathVariable Long teamId, @PathVariable Long bereichId,
                                     @RequestParam(required = false, defaultValue = "true") boolean aktive) {
        return stammdatenService.aufgaben(teamId, bereichId, aktive);
    }

    @PostMapping("/bereiche/{bereichId}/zeitfenster/{zeitfensterId}/aufgaben")
    @ResponseStatus(HttpStatus.CREATED)
    public AufgabeDto aufgabeAnlegen(@PathVariable Long teamId, @PathVariable Long bereichId,
                                     @PathVariable Long zeitfensterId,
                                     @Valid @RequestBody AufgabeAnlegenAnfrage anfrage) {
        return stammdatenService.aufgabeAnlegen(teamId, bereichId, zeitfensterId, anfrage);
    }

    @PutMapping("/bereiche/{bereichId}/aufgaben/{aufgabeId}")
    public AufgabeDto aufgabeAendern(@PathVariable Long teamId, @PathVariable Long bereichId,
                                     @PathVariable Long aufgabeId, @RequestBody AufgabeAendernAnfrage anfrage) {
        return stammdatenService.aufgabeAendern(teamId, bereichId, aufgabeId, anfrage);
    }

    @GetMapping("/bereiche/{bereichId}/soll")
    public SollListeDto sollListe(@PathVariable Long teamId, @PathVariable Long bereichId) {
        return stammdatenService.sollListe(teamId, bereichId);
    }

    @PutMapping("/bereiche/{bereichId}/soll")
    public void sollSetzen(@PathVariable Long teamId, @PathVariable Long bereichId,
                           @RequestBody List<SollAendernAnfrage> anfragen) {
        stammdatenService.sollSetzen(teamId, bereichId, anfragen);
    }

    @GetMapping("/mitglieder")
    public List<MitgliedDto> mitglieder(@PathVariable Long teamId,
                                        @RequestParam(required = false, defaultValue = "false") boolean alle) {
        return stammdatenService.mitglieder(teamId, alle);
    }

    @PostMapping("/mitglieder")
    @ResponseStatus(HttpStatus.CREATED)
    public MitgliedDto mitgliedAnlegen(@PathVariable Long teamId, @Valid @RequestBody MitgliedAnlegenAnfrage anfrage) {
        return stammdatenService.mitgliedAnlegen(teamId, anfrage);
    }

    @PutMapping("/mitglieder/{mitgliedId}")
    public MitgliedDto mitgliedAendern(@PathVariable Long teamId, @PathVariable Long mitgliedId,
                                       @Valid @RequestBody MitgliedAendernAnfrage anfrage) {
        return stammdatenService.mitgliedAendern(teamId, mitgliedId, anfrage);
    }

    @GetMapping("/mitglieder/{mitgliedId}/avatar")
    public ResponseEntity<byte[]> mitgliedAvatar(@PathVariable Long teamId, @PathVariable Long mitgliedId) {
        return avatarService.laden(teamId, mitgliedId)
            .map(bild -> ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(bild.contentType() == null
                    ? MediaType.IMAGE_JPEG_VALUE : bild.contentType()))
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .body(bild.daten()))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/mitglieder/{mitgliedId}/avatar")
    public MitgliedDto mitgliedAvatarHochladen(@PathVariable Long teamId, @PathVariable Long mitgliedId,
                                               @RequestParam("file") MultipartFile file) {
        return stammdatenService.mitgliedDtoFuer(avatarService.hochladen(teamId, mitgliedId, file));
    }

    @DeleteMapping("/mitglieder/{mitgliedId}/avatar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void mitgliedAvatarLoeschen(@PathVariable Long teamId, @PathVariable Long mitgliedId) {
        avatarService.loeschen(teamId, mitgliedId);
    }

    @GetMapping("/statistik")
    public StatistikDto statistik(@PathVariable Long teamId, @RequestParam Long bereichId,
                                  @RequestParam(required = false) Integer isoJahr,
                                  @RequestParam(required = false) Integer isoWoche,
                                  @RequestParam(required = false) Integer jahr,
                                  @RequestParam(required = false) Integer monat) {
        return statistikService.statistik(teamId, bereichId, isoJahr, isoWoche, jahr, monat);
    }
}
