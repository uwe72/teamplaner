package de.gassi.service;

import de.gassi.domain.BesuchGranularitaet;
import de.gassi.domain.Teammitglied;
import de.gassi.dto.BesuchMitgliedDto;
import de.gassi.dto.BesuchStatistikDto;
import de.gassi.dto.BesuchTeamDto;
import de.gassi.dto.BesuchZeitverlaufDto;
import de.gassi.repository.BesuchLogRepository;
import de.gassi.repository.TeammitgliedRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class BesuchStatistikServiceTest {

    private BesuchLogRepository besuchLogRepository;
    private TeammitgliedRepository teammitgliedRepository;
    private ZeitService zeitService;
    private BesuchStatistikService service;

    @BeforeEach
    void setup() {
        besuchLogRepository = mock(BesuchLogRepository.class);
        teammitgliedRepository = mock(TeammitgliedRepository.class);
        zeitService = mock(ZeitService.class);
        service = new BesuchStatistikService(besuchLogRepository, teammitgliedRepository, zeitService);
    }

    private Teammitglied mitglied(Long id, String login, Integer besuchAnzahl) {
        return Teammitglied.builder().id(id).login(login).besuchAnzahl(besuchAnzahl).build();
    }

    @Test
    void besuchErfassen_neuerTag_erhoehtZaehler() {
        LocalDate heute = LocalDate.of(2026, 10, 3);
        Teammitglied anna = mitglied(1L, "anna", 5);
        when(zeitService.heute()).thenReturn(heute);
        when(besuchLogRepository.insertBesuchIfAbsent(1L, heute)).thenReturn(1);

        service.besuchErfassen(anna);

        verify(teammitgliedRepository).save(anna);
        assertThat(anna.getBesuchAnzahl()).isEqualTo(6);
    }

    @Test
    void besuchErfassen_ohneZaehler_startetBeiEins() {
        LocalDate heute = LocalDate.of(2026, 10, 3);
        Teammitglied anna = mitglied(1L, "anna", null);
        when(zeitService.heute()).thenReturn(heute);
        when(besuchLogRepository.insertBesuchIfAbsent(1L, heute)).thenReturn(1);

        service.besuchErfassen(anna);

        verify(teammitgliedRepository).save(anna);
        assertThat(anna.getBesuchAnzahl()).isEqualTo(1);
    }

    @Test
    void besuchErfassen_gleicherTagNochmal_zaehltNicht() {
        LocalDate heute = LocalDate.of(2026, 10, 3);
        Teammitglied anna = mitglied(1L, "anna", 5);
        when(zeitService.heute()).thenReturn(heute);
        when(besuchLogRepository.insertBesuchIfAbsent(1L, heute)).thenReturn(0);

        service.besuchErfassen(anna);

        verify(teammitgliedRepository, never()).save(any());
        assertThat(anna.getBesuchAnzahl()).isEqualTo(5);
    }

    @Test
    void besuchErfassen_datenbankfehler_wirdVerschluckt() {
        LocalDate heute = LocalDate.of(2026, 10, 3);
        Teammitglied anna = mitglied(1L, "anna", 5);
        when(zeitService.heute()).thenReturn(heute);
        when(besuchLogRepository.insertBesuchIfAbsent(1L, heute))
            .thenThrow(new RuntimeException("db down"));

        assertThatCode(() -> service.besuchErfassen(anna)).doesNotThrowAnyException();

        verify(teammitgliedRepository, never()).save(any());
        assertThat(anna.getBesuchAnzahl()).isEqualTo(5);
    }

    @Test
    void statistik_aggregiertProMitgliedUndMonat() {
        LocalDate von = LocalDate.of(2026, 1, 1);
        LocalDate bis = LocalDate.of(2026, 3, 1);
        when(besuchLogRepository.zaehleBesucheNachMonatUndMitglied(7L, von, bis)).thenReturn(List.of(
            zeile(2026, 1, 1L, "anna", "Anna", 12L),
            zeile(2026, 1, 2L, "bert", "Bert", 4L),
            zeile(2026, 2, 1L, "anna", "Anna", 8L)
        ));

        BesuchStatistikDto resultat = service.statistik(7L, von, bis);

        assertThat(resultat.monate()).hasSize(2);
        assertThat(resultat.monate().get(0).jahr()).isEqualTo(2026);
        assertThat(resultat.monate().get(0).monat()).isEqualTo(1);
        assertThat(resultat.monate().get(0).besucheGesamt()).isEqualTo(16);
        assertThat(resultat.monate().get(0).mitglieder()).extracting(BesuchMitgliedDto::login)
            .containsExactly("anna", "bert");
        assertThat(resultat.monate().get(1).besucheGesamt()).isEqualTo(8);
    }

    @Test
    void statistik_fuelltLeereMonate() {
        LocalDate von = LocalDate.of(2026, 1, 1);
        LocalDate bis = LocalDate.of(2026, 4, 1);
        when(besuchLogRepository.zaehleBesucheNachMonatUndMitglied(7L, von, bis)).thenReturn(List.of(
            zeile(2026, 1, 1L, "anna", "Anna", 3L),
            zeile(2026, 3, 2L, "bert", "Bert", 2L)
        ));

        BesuchStatistikDto resultat = service.statistik(7L, von, bis);

        assertThat(resultat.monate()).hasSize(3);
        assertThat(resultat.monate().get(0).besucheGesamt()).isEqualTo(3);
        assertThat(resultat.monate().get(1).mitglieder()).isEmpty();
        assertThat(resultat.monate().get(1).besucheGesamt()).isZero();
        assertThat(resultat.monate().get(2).besucheGesamt()).isEqualTo(2);
    }

    @Test
    void statistik_ueberspringtJahresgrenze() {
        LocalDate von = LocalDate.of(2025, 11, 1);
        LocalDate bis = LocalDate.of(2026, 1, 1);
        when(besuchLogRepository.zaehleBesucheNachMonatUndMitglied(7L, von, bis)).thenReturn(List.of(
            zeile(2025, 11, 1L, "anna", "Anna", 4L),
            zeile(2025, 12, 1L, "anna", "Anna", 1L)
        ));

        BesuchStatistikDto resultat = service.statistik(7L, von, bis);

        assertThat(resultat.monate()).hasSize(2);
        assertThat(resultat.monate().get(0).monat()).isEqualTo(11);
        assertThat(resultat.monate().get(0).jahr()).isEqualTo(2025);
        assertThat(resultat.monate().get(1).monat()).isEqualTo(12);
        assertThat(resultat.monate().get(1).jahr()).isEqualTo(2025);
    }

    @Test
    void statistikAlleTeams_aggregiertUebergreifendMitTeamname() {
        LocalDate von = LocalDate.of(2026, 1, 1);
        LocalDate bis = LocalDate.of(2026, 2, 1);
        when(besuchLogRepository.zaehleBesucheNachMonatUndMitgliedAlleTeams(von, bis)).thenReturn(List.of(
            zeileMitTeam(2026, 1, 1L, "anna", "Anna", "Familie A", 6L),
            zeileMitTeam(2026, 1, 2L, "bert", "Bert", "Verein B", 9L)
        ));

        BesuchStatistikDto resultat = service.statistikAlleTeams(von, bis);

        assertThat(resultat.monate()).hasSize(1);
        var mitglieder = resultat.monate().get(0).mitglieder();
        assertThat(mitglieder).hasSize(2);
        assertThat(mitglieder.get(0).login()).isEqualTo("bert");
        assertThat(mitglieder.get(0).teamName()).isEqualTo("Verein B");
        assertThat(mitglieder.get(1).teamName()).isEqualTo("Familie A");
        assertThat(resultat.monate().get(0).besucheGesamt()).isEqualTo(15);
    }

    @Test
    void besucheJeTeam_sortiertAbsteigendNachBesuchen() {
        LocalDate von = LocalDate.of(2026, 1, 1);
        LocalDate bis = LocalDate.of(2026, 2, 1);
        when(besuchLogRepository.zaehleBesucheNachTeam(von, bis)).thenReturn(List.of(
            new Object[]{1L, "Verein B", 5L, 2L},
            new Object[]{2L, "Familie A", 11L, 3L}
        ));

        List<BesuchTeamDto> resultat = service.besucheJeTeam(von, bis);

        assertThat(resultat).hasSize(2);
        assertThat(resultat.get(0).teamName()).isEqualTo("Familie A");
        assertThat(resultat.get(0).besuche()).isEqualTo(11);
        assertThat(resultat.get(0).verschiedeneMitglieder()).isEqualTo(3);
        assertThat(resultat.get(1).teamName()).isEqualTo("Verein B");
    }

    @Test
    void zeitverlaufAlleTeams_zaehltPlattformweit() {
        LocalDate heute = LocalDate.of(2026, 10, 3);
        when(zeitService.heute()).thenReturn(heute);
        when(besuchLogRepository.zaehleBesucheNachPeriodeAlleTeams(eq("day"), any(), any()))
            .thenReturn(java.util.Collections.singletonList(new Object[]{Date.valueOf(heute), 20L, 8L}));
        when(teammitgliedRepository.countByAktivTrueAndTeamIsNotNull()).thenReturn(30L);

        BesuchZeitverlaufDto resultat = service.zeitverlaufAlleTeams(BesuchGranularitaet.TAG);

        assertThat(resultat.granularitaet()).isEqualTo("TAG");
        assertThat(resultat.gesamtMitglieder()).isEqualTo(30L);
        assertThat(resultat.bucketListe()).hasSize(60);
        assertThat(resultat.bucketListe().get(59).besuche()).isEqualTo(20L);
        assertThat(resultat.bucketListe().get(59).verschiedeneMitglieder()).isEqualTo(8L);
    }

    @Test
    void zeitverlauf_tag_fuelltSechzigBuckets() {
        LocalDate heute = LocalDate.of(2026, 10, 3);
        when(zeitService.heute()).thenReturn(heute);
        when(besuchLogRepository.zaehleBesucheNachPeriode(eq("day"), eq(7L), any(), any()))
            .thenReturn(java.util.Collections.singletonList(new Object[]{Date.valueOf(heute), 7L, 3L}));
        when(teammitgliedRepository.countByTeamIdAndAktivTrue(7L)).thenReturn(12L);

        BesuchZeitverlaufDto resultat = service.zeitverlauf(7L, BesuchGranularitaet.TAG);

        assertThat(resultat.granularitaet()).isEqualTo("TAG");
        assertThat(resultat.gesamtMitglieder()).isEqualTo(12L);
        assertThat(resultat.bucketListe()).hasSize(60);
        assertThat(resultat.bucketListe().get(0).periodenStart()).isEqualTo(heute.minusDays(59));
        assertThat(resultat.bucketListe().get(59).periodenStart()).isEqualTo(heute);
        assertThat(resultat.bucketListe().get(59).besuche()).isEqualTo(7L);
        assertThat(resultat.bucketListe().get(59).verschiedeneMitglieder()).isEqualTo(3L);
        assertThat(resultat.bucketListe().get(58).besuche()).isZero();
        assertThat(resultat.bucketListe().get(58).verschiedeneMitglieder()).isZero();
    }

    @Test
    void zeitverlauf_monat_fuelltVierundzwanzigBuckets() {
        LocalDate heute = LocalDate.of(2026, 10, 15);
        LocalDate monatsstart = LocalDate.of(2026, 10, 1);
        when(zeitService.heute()).thenReturn(heute);
        when(besuchLogRepository.zaehleBesucheNachPeriode(eq("month"), eq(7L), any(), any()))
            .thenReturn(java.util.Collections.singletonList(new Object[]{Date.valueOf(monatsstart.minusMonths(5)), 9L, 4L}));
        when(teammitgliedRepository.countByTeamIdAndAktivTrue(7L)).thenReturn(8L);

        BesuchZeitverlaufDto resultat = service.zeitverlauf(7L, BesuchGranularitaet.MONAT);

        assertThat(resultat.bucketListe()).hasSize(24);
        assertThat(resultat.bucketListe().get(0).periodenStart()).isEqualTo(monatsstart.minusMonths(23));
        assertThat(resultat.bucketListe().get(18).periodenStart()).isEqualTo(monatsstart.minusMonths(5));
        assertThat(resultat.bucketListe().get(18).besuche()).isEqualTo(9L);
        assertThat(resultat.bucketListe().get(18).verschiedeneMitglieder()).isEqualTo(4L);
        assertThat(resultat.bucketListe().get(17).besuche()).isZero();
        assertThat(resultat.bucketListe().get(23).periodenStart()).isEqualTo(monatsstart);
    }

    private Object[] zeile(int jahr, int monat, Long mitgliedId, String login, String anzeigename, long anzahl) {
        return zeileMitTeam(jahr, monat, mitgliedId, login, anzeigename, null, anzahl);
    }

    private Object[] zeileMitTeam(int jahr, int monat, Long mitgliedId, String login, String anzeigename,
                                  String teamName, long anzahl) {
        return new Object[]{jahr, monat, mitgliedId, login, anzeigename, teamName, anzahl};
    }
}
