package de.gassi.service;

import de.gassi.domain.Aufgabe;
import de.gassi.domain.Rolle;
import de.gassi.domain.Teammitglied;
import de.gassi.domain.Zeitfenster;
import de.gassi.domain.Zuteilung;
import de.gassi.dto.ZuteilungAnlegenAnfrage;
import de.gassi.dto.ZuteilungDto;
import de.gassi.dto.ZeitfensterZuteilungAnlegenAnfrage;
import de.gassi.exception.BusinessFehler;
import de.gassi.repository.AufgabeRepository;
import de.gassi.repository.TeammitgliedRepository;
import de.gassi.repository.ZeitfensterRepository;
import de.gassi.repository.ZuteilungRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ZuteilungService {

    private final ZuteilungRepository zuteilungRepository;
    private final AufgabeRepository aufgabeRepository;
    private final TeammitgliedRepository teammitgliedRepository;
    private final ZeitfensterRepository zeitfensterRepository;
    private final TeamZugriffsPruefer zugriffsPruefer;
    private final ZeitService zeitService;

    @Transactional
    public ZuteilungDto zuweisen(Long teamId, ZuteilungAnlegenAnfrage anfrage) {
        Teammitglied nutzer = zugriffsPruefer.pruefeZugriff(teamId);
        Aufgabe aufgabe = aufgabeRepository.findById(anfrage.aufgabeId())
            .filter(a -> a.getZeitfenster() != null && a.getZeitfenster().getBereich() != null
                && a.getZeitfenster().getBereich().getTeam() != null
                && a.getZeitfenster().getBereich().getTeam().getId().equals(teamId))
            .orElseThrow(() -> new BusinessFehler("AUFGABE_UNBEKANNT", "Diese Aufgabe existiert nicht."));
        if (!aufgabe.isAktiv()) {
            throw new BusinessFehler("AUFGABE_INAKTIV", "An eine deaktivierte Aufgabe kann nicht zugewiesen werden.");
        }

        Teammitglied ziel = teammitgliedRepository.findById(anfrage.mitgliedId())
            .filter(m -> m.getTeam() != null && m.getTeam().getId().equals(teamId))
            .orElseThrow(() -> new BusinessFehler("MITGLIED_UNBEKANNT", "Dieses Teammitglied existiert nicht."));
        if (!ziel.isAktiv()) {
            throw new BusinessFehler("MITGLIED_INAKTIV", "Deaktivierte Mitglieder können nicht zugeteilt werden.");
        }

        pruefeDatumregel(nutzer, anfrage.datum());

        try {
            zuteilungRepository.findByAufgabeIdAndDatum(aufgabe.getId(), anfrage.datum())
                .ifPresent(zuteilungRepository::delete);
            zuteilungRepository.flush();
            Zuteilung zuteilung = Zuteilung.builder()
                .aufgabe(aufgabe)
                .mitglied(ziel)
                .datum(anfrage.datum())
                .zugewiesenAm(zeitService.jetzt())
                .build();
            return zuDto(zuteilungRepository.save(zuteilung));
        } catch (DataIntegrityViolationException | ObjectOptimisticLockingFailureException e) {
            throw new BusinessFehler("ZUTEILUNG_KONFLIKT",
                "Die Zelle wurde gleichzeitig geändert — bitte Seite neu laden und nochmal versuchen.");
        }
    }

    @Transactional
    public List<ZuteilungDto> zeitfensterZuweisen(Long teamId, Long zeitfensterId, ZeitfensterZuteilungAnlegenAnfrage anfrage) {
        Teammitglied nutzer = zugriffsPruefer.pruefeZugriff(teamId);
        Zeitfenster zeitfenster = zeitfensterRepository.findById(zeitfensterId)
            .filter(z -> z.getBereich() != null && z.getBereich().getTeam() != null
                && z.getBereich().getTeam().getId().equals(teamId))
            .orElseThrow(() -> new BusinessFehler("ZEITFENSTER_UNBEKANNT", "Dieses Zeitfenster existiert nicht."));
        if (!zeitfenster.isAktiv()) {
            throw new BusinessFehler("ZEITFENSTER_INAKTIV", "An ein deaktiviertes Zeitfenster kann nicht zugewiesen werden.");
        }

        Teammitglied ziel = teammitgliedRepository.findById(anfrage.mitgliedId())
            .filter(m -> m.getTeam() != null && m.getTeam().getId().equals(teamId))
            .orElseThrow(() -> new BusinessFehler("MITGLIED_UNBEKANNT", "Dieses Teammitglied existiert nicht."));
        if (!ziel.isAktiv()) {
            throw new BusinessFehler("MITGLIED_INAKTIV", "Deaktivierte Mitglieder können nicht zugeteilt werden.");
        }

        pruefeDatumregel(nutzer, anfrage.datum());

        List<Aufgabe> aufgaben = aufgabeRepository.findByZeitfensterIdAndAktivTrueOrderByPositionAsc(zeitfenster.getId());
        if (aufgaben.isEmpty()) {
            throw new BusinessFehler("KEINE_AUFGABEN", "Dieses Zeitfenster hat keine aktiven Aufgaben.");
        }

        try {
            List<ZuteilungDto> ergebnis = new ArrayList<>();
            for (Aufgabe aufgabe : aufgaben) {
                zuteilungRepository.findByAufgabeIdAndDatum(aufgabe.getId(), anfrage.datum())
                    .ifPresent(bestehend -> {
                        zuteilungRepository.delete(bestehend);
                        zuteilungRepository.flush();
                    });
                Zuteilung zuteilung = Zuteilung.builder()
                    .aufgabe(aufgabe)
                    .mitglied(ziel)
                    .datum(anfrage.datum())
                    .zugewiesenAm(zeitService.jetzt())
                    .build();
                ergebnis.add(zuDto(zuteilungRepository.save(zuteilung)));
            }
            zuteilungRepository.flush();
            return ergebnis;
        } catch (DataIntegrityViolationException | ObjectOptimisticLockingFailureException e) {
            throw new BusinessFehler("ZUTEILUNG_KONFLIKT",
                "Die Zellen wurden gleichzeitig geändert — bitte Seite neu laden und nochmal versuchen.");
        }
    }

    @Transactional
    public void loeschen(Long teamId, Long zuteilungId) {
        Teammitglied nutzer = zugriffsPruefer.pruefeZugriff(teamId);
        Zuteilung zuteilung = zuteilungRepository.findById(zuteilungId)
            .filter(z -> z.getAufgabe() != null && z.getAufgabe().getZeitfenster() != null
                && z.getAufgabe().getZeitfenster().getBereich() != null
                && z.getAufgabe().getZeitfenster().getBereich().getTeam() != null
                && z.getAufgabe().getZeitfenster().getBereich().getTeam().getId().equals(teamId))
            .orElseThrow(() -> new BusinessFehler("ZUTEILUNG_UNBEKANNT", "Diese Zuteilung existiert nicht."));
        pruefeDatumregel(nutzer, zuteilung.getDatum());
        try {
            zuteilungRepository.delete(zuteilung);
            zuteilungRepository.flush();
        } catch (DataIntegrityViolationException | ObjectOptimisticLockingFailureException e) {
            throw new BusinessFehler("ZUTEILUNG_KONFLIKT",
                "Die Zelle wurde gleichzeitig geändert — bitte Seite neu laden und nochmal versuchen.");
        }
    }

    private void pruefeDatumregel(Teammitglied nutzer, LocalDate datum) {
        if (datum.isBefore(zeitService.heute()) && nutzer.getRolle() != Rolle.ADMIN
            && nutzer.getRolle() != Rolle.SUPER_ADMIN) {
            throw new BusinessFehler("VERGANGENHEIT_GESPERRT",
                "Vergangene Tage dürfen nur von einem Admin geändert werden.");
        }
    }

    private ZuteilungDto zuDto(Zuteilung zuteilung) {
        return new ZuteilungDto(zuteilung.getId(), zuteilung.getAufgabe().getId(),
            zuteilung.getMitglied().getId(), zuteilung.getMitglied().getAnzeigename(),
            zuteilung.getMitglied().getFarbe(), zuteilung.getDatum());
    }
}
