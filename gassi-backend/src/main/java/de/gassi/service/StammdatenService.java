package de.gassi.service;

import de.gassi.domain.Aufgabe;
import de.gassi.domain.Bereich;
import de.gassi.domain.Rolle;
import de.gassi.domain.Soll;
import de.gassi.domain.Teammitglied;
import de.gassi.domain.Zeitfenster;
import de.gassi.dto.AufgabeAendernAnfrage;
import de.gassi.dto.AufgabeAnlegenAnfrage;
import de.gassi.dto.AufgabeDto;import de.gassi.dto.BereichAendernAnfrage;
import de.gassi.dto.BereichAnlegenAnfrage;
import de.gassi.dto.BereichDto;
import de.gassi.dto.MitgliedAendernAnfrage;
import de.gassi.dto.MitgliedAnlegenAnfrage;
import de.gassi.dto.MitgliedDto;
import de.gassi.dto.SollAendernAnfrage;
import de.gassi.dto.SollListeDto;
import de.gassi.dto.ZeitfensterAendernAnfrage;
import de.gassi.dto.ZeitfensterAnlegenAnfrage;
import de.gassi.dto.ZeitfensterDto;
import de.gassi.exception.BusinessFehler;
import de.gassi.repository.AufgabeRepository;
import de.gassi.repository.BereichRepository;
import de.gassi.repository.SollRepository;
import de.gassi.repository.TeammitgliedRepository;
import de.gassi.repository.ZeitfensterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StammdatenService {

    private static final long TAGE_PRO_WOCHE = 7;

    private final BereichRepository bereichRepository;
    private final ZeitfensterRepository zeitfensterRepository;
    private final AufgabeRepository aufgabeRepository;
    private final SollRepository sollRepository;
    private final TeammitgliedRepository teammitgliedRepository;
    private final TeamZugriffsPruefer zugriffsPruefer;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public List<BereichDto> bereiche(Long teamId, boolean alle) {
        zugriffsPruefer.pruefeZugriff(teamId);
        List<Bereich> bereiche = alle
            ? bereichRepository.findByTeamIdOrderByPositionAsc(teamId)
            : bereichRepository.findByTeamIdAndAktivTrueOrderByPositionAsc(teamId);
        return bereiche.stream().map(this::zuBereichDto).toList();
    }

    @Transactional
    public BereichDto bereichAnlegen(Long teamId, BereichAnlegenAnfrage anfrage) {
        Teammitglied nutzer = zugriffsPruefer.pruefeAdminZugriff(teamId);
        pruefeTeamVorhanden(nutzer);
        String name = anfrage.name().trim();
        if (bereichRepository.existsByTeamIdAndNameIgnoreCase(teamId, name)) {
            throw new BusinessFehler("NAME_BELEGT", "Diesen Bereichsnamen gibt es in deinem Team bereits.");
        }
        List<Bereich> bestehende = bereichRepository.findByTeamIdOrderByPositionAsc(teamId);
        int position = bestehende.isEmpty() ? 0 : bestehende.get(bestehende.size() - 1).getPosition() + 1;
        Bereich bereich = Bereich.builder()
            .team(nutzer.getTeam())
            .name(name)
            .aktiv(true)
            .position(position)
            .build();
        return zuBereichDto(bereichRepository.save(bereich));
    }

    @Transactional
    public BereichDto bereichAendern(Long teamId, Long bereichId, BereichAendernAnfrage anfrage) {
        zugriffsPruefer.pruefeAdminZugriff(teamId);
        Bereich bereich = ladeBereichAusTeam(teamId, bereichId);
        if (anfrage.name() != null) {
            String name = anfrage.name().trim();
            if (!bereich.getName().equalsIgnoreCase(name)
                && bereichRepository.existsByTeamIdAndNameIgnoreCase(teamId, name)) {
                throw new BusinessFehler("NAME_BELEGT", "Diesen Bereichsnamen gibt es in deinem Team bereits.");
            }
            bereich.setName(name);
        }
        if (anfrage.aktiv() != null) {
            bereich.setAktiv(anfrage.aktiv());
        }
        if (anfrage.position() != null) {
            bereich.setPosition(anfrage.position());
        }
        return zuBereichDto(bereichRepository.save(bereich));
    }

    @Transactional
    public List<ZeitfensterDto> zeitfenster(Long teamId, Long bereichId, boolean alle) {
        zugriffsPruefer.pruefeZugriff(teamId);
        ladeBereichAusTeam(teamId, bereichId);
        List<Zeitfenster> zeitfenster = alle
            ? zeitfensterRepository.findByBereichIdOrderByPositionAsc(bereichId)
            : zeitfensterRepository.findByBereichIdAndAktivTrueOrderByPositionAsc(bereichId);
        return zeitfenster.stream().map(this::zuZeitfensterDto).toList();
    }

    @Transactional
    public ZeitfensterDto zeitfensterAnlegen(Long teamId, Long bereichId, ZeitfensterAnlegenAnfrage anfrage) {
        Teammitglied nutzer = zugriffsPruefer.pruefeAdminZugriff(teamId);
        pruefeTeamVorhanden(nutzer);
        Bereich bereich = ladeBereichAusTeam(teamId, bereichId);
        String name = anfrage.name().trim();
        if (zeitfensterRepository.existsByBereichTeamIdAndNameIgnoreCase(teamId, name)) {
            throw new BusinessFehler("NAME_BELEGT", "Diesen Zeitfenster-Namen gibt es in deinem Team bereits.");
        }
        List<Zeitfenster> bestehende = zeitfensterRepository.findByBereichIdOrderByPositionAsc(bereichId);
        int position = bestehende.isEmpty() ? 0 : bestehende.get(bestehende.size() - 1).getPosition() + 1;
        Zeitfenster zeitfenster = Zeitfenster.builder()
            .bereich(bereich)
            .name(name)
            .aktiv(true)
            .position(position)
            .build();
        return zuZeitfensterDto(zeitfensterRepository.save(zeitfenster));
    }

    @Transactional
    public ZeitfensterDto zeitfensterAendern(Long teamId, Long bereichId, Long zeitfensterId,
                                             ZeitfensterAendernAnfrage anfrage) {
        zugriffsPruefer.pruefeAdminZugriff(teamId);
        ladeBereichAusTeam(teamId, bereichId);
        Zeitfenster zeitfenster = ladeZeitfensterAusBereich(bereichId, zeitfensterId);
        if (anfrage.name() != null) {
            String name = anfrage.name().trim();
            if (!zeitfenster.getName().equalsIgnoreCase(name)
                && zeitfensterRepository.existsByBereichTeamIdAndNameIgnoreCase(teamId, name)) {
                throw new BusinessFehler("NAME_BELEGT", "Diesen Zeitfenster-Namen gibt es in deinem Team bereits.");
            }
            zeitfenster.setName(name);
        }
        if (anfrage.aktiv() != null) {
            zeitfenster.setAktiv(anfrage.aktiv());
        }
        if (anfrage.position() != null) {
            zeitfenster.setPosition(anfrage.position());
        }
        return zuZeitfensterDto(zeitfensterRepository.save(zeitfenster));
    }

    @Transactional(readOnly = true)
    public List<AufgabeDto> aufgaben(Long teamId, Long bereichId, boolean nurAktive) {
        zugriffsPruefer.pruefeZugriff(teamId);
        ladeBereichAusTeam(teamId, bereichId);
        List<Zeitfenster> zeitfenster = zeitfensterRepository.findByBereichIdOrderByPositionAsc(bereichId);
        List<Aufgabe> aufgaben = nurAktive
            ? aufgabeRepository.findByZeitfensterInAndAktivTrueOrderByZeitfensterPositionAscPositionAsc(
                zeitfensterLeer(zeitfenster))
            : aufgabeRepository.findByZeitfensterInOrderByZeitfensterPositionAscPositionAsc(
                zeitfensterLeer(zeitfenster));
        return aufgaben.stream().map(this::zuAufgabeDto).toList();
    }

    @Transactional
    public AufgabeDto aufgabeAnlegen(Long teamId, Long bereichId, Long zeitfensterId, AufgabeAnlegenAnfrage anfrage) {
        Teammitglied nutzer = zugriffsPruefer.pruefeAdminZugriff(teamId);
        pruefeTeamVorhanden(nutzer);
        ladeBereichAusTeam(teamId, bereichId);
        Zeitfenster zeitfenster = ladeZeitfensterAusBereich(bereichId, zeitfensterId);
        String name = anfrage.name().trim();
        if (aufgabeRepository.existsByZeitfensterIdAndNameIgnoreCase(zeitfensterId, name)) {
            throw new BusinessFehler("NAME_BELEGT", "Diesen Aufgabenname gibt es in diesem Zeitfenster bereits.");
        }
        List<Aufgabe> bestehende = aufgabeRepository.findByZeitfensterIdOrderByPositionAsc(zeitfensterId);
        int position = bestehende.isEmpty() ? 0 : bestehende.get(bestehende.size() - 1).getPosition() + 1;
        Aufgabe aufgabe = Aufgabe.builder()
            .zeitfenster(zeitfenster)
            .name(name)
            .aktiv(true)
            .position(position)
            .build();
        return zuAufgabeDto(aufgabeRepository.save(aufgabe));
    }

    @Transactional
    public AufgabeDto aufgabeAendern(Long teamId, Long bereichId, Long aufgabeId, AufgabeAendernAnfrage anfrage) {
        zugriffsPruefer.pruefeAdminZugriff(teamId);
        ladeBereichAusTeam(teamId, bereichId);
        Aufgabe aufgabe = ladeAufgabeAusBereich(bereichId, aufgabeId);
        if (anfrage.name() != null) {
            String name = anfrage.name().trim();
            if (!aufgabe.getName().equalsIgnoreCase(name)
                && aufgabeRepository.existsByZeitfensterIdAndNameIgnoreCase(aufgabe.getZeitfenster().getId(), name)) {
                throw new BusinessFehler("NAME_BELEGT", "Diesen Aufgabenname gibt es in diesem Zeitfenster bereits.");
            }
            aufgabe.setName(name);
        }
        if (anfrage.aktiv() != null) {
            aufgabe.setAktiv(anfrage.aktiv());
        }
        if (anfrage.position() != null) {
            aufgabe.setPosition(anfrage.position());
        }
        return zuAufgabeDto(aufgabeRepository.save(aufgabe));
    }

    @Transactional(readOnly = true)
    public SollListeDto sollListe(Long teamId, Long bereichId) {
        zugriffsPruefer.pruefeAdminZugriff(teamId);
        Bereich bereich = ladeBereichAusTeam(teamId, bereichId);
        List<Teammitglied> mitglieder = teammitgliedRepository.findByTeamIdOrderByIdAsc(teamId);
        List<Soll> sollWerte = sollRepository.findByBereichIdOrderByMitgliedAnzeigenameAsc(bereichId);

        long aufkommen = aufkommenProWoche(bereichId);
        int sollSumme = sollWerte.stream().mapToInt(Soll::getWert).sum();
        List<SollListeDto.SollEintrag> eintraege = mitglieder.stream()
            .map(m -> {
                int wert = sollWerte.stream()
                    .filter(s -> s.getMitglied().getId().equals(m.getId()))
                    .findFirst()
                    .map(Soll::getWert)
                    .orElse(0);
                return new SollListeDto.SollEintrag(m.getId(), m.getAnzeigename(), m.isAktiv(), wert);
            })
            .toList();
        return new SollListeDto(bereichId, aufkommen, sollSumme, sollSumme != aufkommen, eintraege);
    }

    @Transactional
    public void sollSetzen(Long teamId, Long bereichId, List<SollAendernAnfrage> anfragen) {
        zugriffsPruefer.pruefeAdminZugriff(teamId);
        Bereich bereich = ladeBereichAusTeam(teamId, bereichId);
        for (SollAendernAnfrage anfrage : anfragen) {
            Teammitglied mitglied = teammitgliedRepository.findById(anfrage.mitgliedId())
                .filter(m -> m.getTeam() != null && m.getTeam().getId().equals(teamId))
                .orElseThrow(() -> new BusinessFehler("MITGLIED_UNBEKANNT", "Dieses Teammitglied existiert nicht."));
            Soll soll = sollRepository.findByBereichIdAndMitgliedId(bereichId, mitglied.getId())
                .orElseGet(() -> Soll.builder().bereich(bereich).mitglied(mitglied).build());
            soll.setWert(anfrage.wert());
            sollRepository.save(soll);
        }
    }

    @Transactional(readOnly = true)
    public List<MitgliedDto> mitglieder(Long teamId, boolean alle) {
        zugriffsPruefer.pruefeZugriff(teamId);
        return teammitgliedRepository.findByTeamIdOrderByIdAsc(teamId).stream()
            .filter(m -> alle || m.isAktiv())
            .map(m -> new MitgliedDto(m.getId(), m.getLogin(), m.getEmail(), m.getAnzeigename(),
                m.getRolle().name(), m.isAktiv(),
                m.getTeam() == null ? null : m.getTeam().getId(),
                m.getTeam() == null ? null : m.getTeam().getName(),
                AvatarService.avatarUrlFuer(m.getTeam() == null ? null : m.getTeam().getId(), m.getId(),
                    m.getAvatar() != null && m.getAvatar().length > 0)))
            .toList();
    }

    @Transactional
    public MitgliedDto mitgliedAnlegen(Long teamId, MitgliedAnlegenAnfrage anfrage) {
        Teammitglied nutzer = zugriffsPruefer.pruefeAdminZugriff(teamId);
        pruefeTeamVorhanden(nutzer);
        String login = anfrage.login().trim();
        if (login.isBlank() || login.contains("@") || login.length() > 25) {
            throw new BusinessFehler("LOGIN_UNGUELTIG",
                "Der Loginname darf nicht leer sein, keine E-Mail enthalten und höchstens 25 Zeichen lang sein.");
        }
        if (teammitgliedRepository.existsByLoginIgnoreCase(login)) {
            throw new BusinessFehler("LOGINNAME_BELEGT", "Dieser Loginname ist bereits vergeben.");
        }
        Rolle rolle = anfrage.rolle() == null || anfrage.rolle().isBlank()
            ? Rolle.MITGLIED
            : Rolle.valueOf(anfrage.rolle());
        if (rolle == Rolle.SUPER_ADMIN) {
            throw new BusinessFehler("KEINE_BERECHTIGUNG", "Die Rolle SUPER_ADMIN kann nicht vergeben werden.");
        }
        Teammitglied mitglied = Teammitglied.builder()
            .team(nutzer.getTeam())
            .login(login)
            .email(anfrage.email().trim())
            .passwortHash(passwordEncoder.encode(anfrage.passwort()))
            .anzeigename(anfrage.anzeigename().trim())
            .rolle(rolle)
            .aktiv(true)
            .build();
        mitglied = teammitgliedRepository.save(mitglied);
        return zuMitgliedDto(mitglied);
    }

    @Transactional
    public MitgliedDto mitgliedAendern(Long teamId, Long mitgliedId, MitgliedAendernAnfrage anfrage) {
        zugriffsPruefer.pruefeAdminZugriff(teamId);
        Teammitglied mitglied = teammitgliedRepository.findById(mitgliedId)
            .filter(m -> m.getTeam() != null && m.getTeam().getId().equals(teamId))
            .orElseThrow(() -> new BusinessFehler("MITGLIED_UNBEKANNT", "Dieses Teammitglied existiert nicht."));

        boolean wirdDeaktiviert = Boolean.FALSE.equals(anfrage.aktiv()) && mitglied.isAktiv();
        boolean verliertAdmin = (anfrage.rolle() != null && !anfrage.rolle().isBlank()
            && Rolle.valueOf(anfrage.rolle()) != Rolle.ADMIN)
            || wirdDeaktiviert;
        if (verliertAdmin && mitglied.getRolle() == Rolle.ADMIN) {
            long aktiveAdmins = teammitgliedRepository.findByTeamIdOrderByIdAsc(teamId).stream()
                .filter(Teammitglied::isAktiv)
                .filter(m -> m.getRolle() == Rolle.ADMIN)
                .filter(m -> !m.getId().equals(mitgliedId))
                .count();
            if (aktiveAdmins == 0) {
                throw new BusinessFehler("LETZTER_ADMIN",
                    "Es muss mindestens ein aktiver Admin im Team bleiben.");
            }
        }

        mitglied.setAnzeigename(anfrage.anzeigename().trim());
        mitglied.setEmail(anfrage.email().trim());
        if (anfrage.rolle() != null && !anfrage.rolle().isBlank()) {
            Rolle rolle = Rolle.valueOf(anfrage.rolle());
            if (rolle == Rolle.SUPER_ADMIN) {
                throw new BusinessFehler("KEINE_BERECHTIGUNG", "Die Rolle SUPER_ADMIN kann nicht vergeben werden.");
            }
            mitglied.setRolle(rolle);
        }
        if (anfrage.aktiv() != null) {
            mitglied.setAktiv(anfrage.aktiv());
        }
        if (anfrage.passwort() != null && !anfrage.passwort().isBlank()) {
            mitglied.setPasswortHash(passwordEncoder.encode(anfrage.passwort()));
        }
        return zuMitgliedDto(teammitgliedRepository.save(mitglied));
    }

    public long aufkommenProWoche(Long bereichId) {
        return TAGE_PRO_WOCHE
            * aufgabeRepository.findByZeitfensterBereichIdAndAktivTrue(bereichId).size();
    }

    private List<Zeitfenster> zeitfensterLeer(List<Zeitfenster> zeitfenster) {
        return zeitfenster.isEmpty() ? List.of() : zeitfenster;
    }

    private void pruefeTeamVorhanden(Teammitglied nutzer) {
        if (nutzer.getTeam() == null) {
            throw new BusinessFehler("KEIN_TEAM", "Dein Account gehört noch zu keinem Team.");
        }
    }

    private Bereich ladeBereichAusTeam(Long teamId, Long bereichId) {
        return bereichRepository.findById(bereichId)
            .filter(b -> b.getTeam() != null && b.getTeam().getId().equals(teamId))
            .orElseThrow(() -> new BusinessFehler("BEREICH_UNBEKANNT", "Dieser Bereich existiert nicht."));
    }

    private Zeitfenster ladeZeitfensterAusBereich(Long bereichId, Long zeitfensterId) {
        return zeitfensterRepository.findById(zeitfensterId)
            .filter(z -> z.getBereich() != null && z.getBereich().getId().equals(bereichId))
            .orElseThrow(() -> new BusinessFehler("ZEITFENSTER_UNBEKANNT", "Dieses Zeitfenster existiert nicht."));
    }

    private Aufgabe ladeAufgabeAusBereich(Long bereichId, Long aufgabeId) {
        return aufgabeRepository.findById(aufgabeId)
            .filter(a -> a.getZeitfenster() != null
                && a.getZeitfenster().getBereich() != null
                && a.getZeitfenster().getBereich().getId().equals(bereichId))
            .orElseThrow(() -> new BusinessFehler("AUFGABE_UNBEKANNT", "Diese Aufgabe existiert nicht."));
    }

    private BereichDto zuBereichDto(Bereich bereich) {
        return new BereichDto(bereich.getId(), bereich.getName(), bereich.isAktiv(), bereich.getPosition());
    }

    private ZeitfensterDto zuZeitfensterDto(Zeitfenster zeitfenster) {
        return new ZeitfensterDto(zeitfenster.getId(), zeitfenster.getBereich().getId(),
            zeitfenster.getName(), zeitfenster.isAktiv(), zeitfenster.getPosition());
    }

    private AufgabeDto zuAufgabeDto(Aufgabe aufgabe) {
        return new AufgabeDto(aufgabe.getId(), aufgabe.getZeitfenster().getId(), aufgabe.getName(),
            aufgabe.isAktiv(), aufgabe.getPosition());
    }

    private MitgliedDto zuMitgliedDto(Teammitglied m) {
        return new MitgliedDto(m.getId(), m.getLogin(), m.getEmail(), m.getAnzeigename(),
            m.getRolle().name(), m.isAktiv(),
            m.getTeam() == null ? null : m.getTeam().getId(),
            m.getTeam() == null ? null : m.getTeam().getName(),
            AvatarService.avatarUrlFuer(m.getTeam() == null ? null : m.getTeam().getId(), m.getId(),
                m.getAvatar() != null && m.getAvatar().length > 0));
    }

    public MitgliedDto mitgliedDtoFuer(Teammitglied m) {
        return zuMitgliedDto(m);
    }
}
