package de.gassi.service;

import de.gassi.domain.Aufgabe;
import de.gassi.domain.Bereich;
import de.gassi.domain.Soll;
import de.gassi.domain.Team;
import de.gassi.domain.Teammitglied;
import de.gassi.domain.Zuteilung;
import de.gassi.domain.Zeitfenster;
import de.gassi.dto.HaPlanDto;
import de.gassi.dto.StatistikDto;
import de.gassi.repository.AufgabeRepository;
import de.gassi.repository.BereichRepository;
import de.gassi.repository.SollRepository;
import de.gassi.repository.TeammitgliedRepository;
import de.gassi.repository.ZuteilungRepository;
import de.gassi.repository.ZeitfensterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class HaPlanService {

    private static final int MAX_KANTE = 128;
    private static final String[] TAG_KURZ = {"Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"};
    private static final java.text.Collator DE = java.text.Collator.getInstance(Locale.GERMAN);

    private final BereichRepository bereichRepository;
    private final ZeitfensterRepository zeitfensterRepository;
    private final AufgabeRepository aufgabeRepository;
    private final ZuteilungRepository zuteilungRepository;
    private final SollRepository sollRepository;
    private final TeammitgliedRepository teammitgliedRepository;
    private final ZeitService zeitService;
    private final StatistikService statistikService;

    @Transactional(readOnly = true)
    public HaPlanDto plan(Long bereichId) {
        Bereich bereich = bereichRepository.findById(bereichId)
            .filter(b -> b.getTeam() != null)
            .orElse(null);
        if (bereich == null) {
            return null;
        }
        Team team = bereich.getTeam();

        LocalDate heute = zeitService.heute();
        List<LocalDate> tage = zeitService.tageDerWoche(zeitService.isoJahr(heute), zeitService.isoWoche(heute));
        LocalDate von = tage.get(0);
        LocalDate bis = tage.get(6);

        List<Zeitfenster> zeitfenster = zeitfensterRepository
            .findByBereichIdAndAktivTrueOrderByPositionAsc(bereichId);
        List<Aufgabe> aufgaben = zeitfenster.isEmpty()
            ? List.of()
            : aufgabeRepository.findByZeitfensterInAndAktivTrueOrderByZeitfensterPositionAscPositionAsc(zeitfenster);
        List<Zuteilung> zuteilungen = zuteilungRepository.findImBereichImZeitraum(bereichId, von, bis);

        Map<Long, Map<LocalDate, Zuteilung>> nachAufgabe = new HashMap<>();
        Map<Long, Long> istProMitglied = new HashMap<>();
        for (Zuteilung z : zuteilungen) {
            nachAufgabe.computeIfAbsent(z.getAufgabe().getId(), k -> new HashMap<>()).put(z.getDatum(), z);
            istProMitglied.merge(z.getMitglied().getId(), 1L, Long::sum);
        }

        List<Teammitglied> alleMitglieder = teammitgliedRepository.findByTeamIdOrderByIdAsc(team.getId());
        List<Teammitglied> mitglieder = alleMitglieder.stream()
            .filter(Teammitglied::isAktiv)
            .toList();
        Map<String, String> kuerzel = KuerzelUtil.eindeutigeInitialen(
            mitglieder.stream().map(Teammitglied::getAnzeigename).toList());

        List<HaPlanDto.Person> personen = mitglieder.stream()
            .map(m -> {
                int soll = sollRepository.findByBereichIdAndMitgliedId(bereichId, m.getId())
                    .map(Soll::getWert)
                    .orElse(0);
                long ist = istProMitglied.getOrDefault(m.getId(), 0L);
                String foto = m.getAvatar() != null && m.getAvatar().length > 0
                    ? "/api/ha/foto/" + m.getId()
                    : null;
                return new HaPlanDto.Person(kuerzel.get(m.getAnzeigename()), m.getAnzeigename(), foto,
                    (int) ist, soll);
            })
            .toList();

        int offen = 0;
        List<HaPlanDto.Tag> tagListe = new ArrayList<>();
        for (LocalDate tag : tage) {
            List<HaPlanDto.Runde> runden = new ArrayList<>();
            for (Aufgabe aufgabe : aufgaben) {
                Zuteilung zuteilung = nachAufgabe.getOrDefault(aufgabe.getId(), Map.of()).get(tag);
                boolean frei = zuteilung == null;
                List<String> personenRunde = frei
                    ? List.of()
                    : List.of(kuerzel.getOrDefault(zuteilung.getMitglied().getAnzeigename(), "?"));
                runden.add(new HaPlanDto.Runde(aufgabe.getZeitfenster().getName(), personenRunde, frei));
                if (frei && !tag.isBefore(heute)) {
                    offen++;
                }
            }
            tagListe.add(new HaPlanDto.Tag(tag, TAG_KURZ[tag.getDayOfWeek().getValue() - 1],
                tag.equals(heute), runden));
        }

        StatistikDto statistikDaten = statistikService.statistikOhneZugriffspruefung(
            team.getId(), bereichId, null, null);
        Map<String, String> kuerzelStatistik = KuerzelUtil.eindeutigeInitialen(
            alleMitglieder.stream()
                .map(Teammitglied::getAnzeigename)
                .toList());

        return new HaPlanDto(team.getName(), bereich.getName(), zeitService.isoWoche(heute), von, bis,
            OffsetDateTime.now(ZeitService.ZONE).truncatedTo(ChronoUnit.SECONDS),
            zeitfenster.stream().map(Zeitfenster::getName).toList(),
            personen, tagListe, offen,
            new HaPlanDto.Statistik(
                new HaPlanDto.Block("Seit Teamstart", summeVon(statistikDaten.kumuliert()),
                    personenVon(statistikDaten.kumuliert(), kuerzelStatistik)),
                new HaPlanDto.Block("Zielerreichung", summeVon(statistikDaten.zielerreichung()),
                    personenVon(statistikDaten.zielerreichung(), kuerzelStatistik))));
    }

    private long summeVon(List<StatistikDto.StatistikZeile> zeilen) {
        return zeilen.stream().mapToLong(StatistikDto.StatistikZeile::moeglich).max().orElse(0);
    }

    private List<HaPlanDto.StatistikPerson> personenVon(List<StatistikDto.StatistikZeile> zeilen,
                                                        Map<String, String> kuerzel) {
        return zeilen.stream()
            .map(z -> new HaPlanDto.StatistikPerson(kuerzel.getOrDefault(z.anzeigename(), "?"),
                z.ist(), z.prozent()))
            .sorted(Comparator.comparingDouble(HaPlanDto.StatistikPerson::prozent).reversed()
                .thenComparing(Comparator.comparingLong(HaPlanDto.StatistikPerson::anzahl).reversed())
                .thenComparing(HaPlanDto.StatistikPerson::kuerzel, DE))
            .toList();
    }

    @Transactional(readOnly = true)
    public Optional<AvatarService.Bild> foto(Long mitgliedId) {
        return teammitgliedRepository.findById(mitgliedId)
            .filter(Teammitglied::isAktiv)
            .filter(m -> m.getAvatar() != null && m.getAvatar().length > 0)
            .map(this::skaliert);
    }

    private AvatarService.Bild skaliert(Teammitglied mitglied) {
        byte[] original = mitglied.getAvatar();
        String contentType = mitglied.getAvatarContentType() == null
            ? "image/jpeg"
            : mitglied.getAvatarContentType();

        BufferedImage quelle;
        try {
            quelle = ImageIO.read(new ByteArrayInputStream(original));
        } catch (Exception e) {
            quelle = null;
        }
        if (quelle == null) {
            return new AvatarService.Bild(original, contentType);
        }

        int breite = quelle.getWidth();
        int hoehe = quelle.getHeight();
        double skala = Math.min(1.0, Math.min((double) MAX_KANTE / breite, (double) MAX_KANTE / hoehe));
        if (skala >= 1.0 && "image/jpeg".equals(contentType)) {
            return new AvatarService.Bild(original, contentType);
        }

        int neuBreite = Math.max(1, (int) Math.round(breite * skala));
        int neuHoehe = Math.max(1, (int) Math.round(hoehe * skala));
        BufferedImage ziel = new BufferedImage(neuBreite, neuHoehe, BufferedImage.TYPE_INT_RGB);
        Graphics2D grafik = ziel.createGraphics();
        grafik.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        grafik.setColor(Color.WHITE);
        grafik.fillRect(0, 0, neuBreite, neuHoehe);
        grafik.drawImage(quelle, 0, 0, neuBreite, neuHoehe, null);
        grafik.dispose();

        ByteArrayOutputStream puffer = new ByteArrayOutputStream();
        try {
            ImageIO.write(ziel, "jpg", puffer);
        } catch (IOException e) {
            return new AvatarService.Bild(original, contentType);
        }
        return new AvatarService.Bild(puffer.toByteArray(), "image/jpeg");
    }
}
