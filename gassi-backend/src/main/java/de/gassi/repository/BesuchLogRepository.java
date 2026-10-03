package de.gassi.repository;

import de.gassi.domain.BesuchLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface BesuchLogRepository extends JpaRepository<BesuchLog, Long> {

    @Modifying
    @Query(value = "INSERT INTO besuch_log (mitglied_id, besuch_datum) VALUES (:mitgliedId, :besuchDatum) ON CONFLICT DO NOTHING",
        nativeQuery = true)
    int insertBesuchIfAbsent(@Param("mitgliedId") Long mitgliedId, @Param("besuchDatum") LocalDate besuchDatum);

    @Query("""
        SELECT YEAR(v.besuchDatum) AS jahr, MONTH(v.besuchDatum) AS monat,
               v.mitglied.id AS mitgliedId, v.mitglied.login AS login,
               v.mitglied.anzeigename AS anzeigename, v.mitglied.team.name AS teamName,
               COUNT(v) AS anzahl
        FROM BesuchLog v
        WHERE v.mitglied.team.id = :teamId
          AND v.besuchDatum >= :von AND v.besuchDatum < :bis
        GROUP BY YEAR(v.besuchDatum), MONTH(v.besuchDatum),
                 v.mitglied.id, v.mitglied.login, v.mitglied.anzeigename, v.mitglied.team.name
        ORDER BY YEAR(v.besuchDatum), MONTH(v.besuchDatum)
        """)
    List<Object[]> zaehleBesucheNachMonatUndMitglied(@Param("teamId") Long teamId,
                                                     @Param("von") LocalDate von,
                                                     @Param("bis") LocalDate bis);

    @Query(value = "SELECT CAST(date_trunc(CAST(:einheit AS text), CAST(v.besuch_datum AS timestamp)) AS date) AS perioden_start, " +
            "COUNT(*) AS besuche, COUNT(DISTINCT v.mitglied_id) AS verschiedene_mitglieder " +
            "FROM besuch_log v JOIN teammitglied m ON m.id = v.mitglied_id " +
            "WHERE m.team_id = :teamId AND v.besuch_datum >= :von AND v.besuch_datum < :bis " +
            "GROUP BY perioden_start ORDER BY perioden_start", nativeQuery = true)
    List<Object[]> zaehleBesucheNachPeriode(@Param("einheit") String einheit,
                                            @Param("teamId") Long teamId,
                                            @Param("von") LocalDate von,
                                            @Param("bis") LocalDate bis);

    @Query("""
        SELECT YEAR(v.besuchDatum) AS jahr, MONTH(v.besuchDatum) AS monat,
               v.mitglied.id AS mitgliedId, v.mitglied.login AS login,
               v.mitglied.anzeigename AS anzeigename, v.mitglied.team.name AS teamName,
               COUNT(v) AS anzahl
        FROM BesuchLog v
        WHERE v.besuchDatum >= :von AND v.besuchDatum < :bis
        GROUP BY YEAR(v.besuchDatum), MONTH(v.besuchDatum),
                 v.mitglied.id, v.mitglied.login, v.mitglied.anzeigename, v.mitglied.team.name
        ORDER BY YEAR(v.besuchDatum), MONTH(v.besuchDatum)
        """)
    List<Object[]> zaehleBesucheNachMonatUndMitgliedAlleTeams(@Param("von") LocalDate von,
                                                              @Param("bis") LocalDate bis);

    @Query(value = "SELECT CAST(date_trunc(CAST(:einheit AS text), CAST(v.besuch_datum AS timestamp)) AS date) AS perioden_start, " +
            "COUNT(*) AS besuche, COUNT(DISTINCT v.mitglied_id) AS verschiedene_mitglieder " +
            "FROM besuch_log v " +
            "WHERE v.besuch_datum >= :von AND v.besuch_datum < :bis " +
            "GROUP BY perioden_start ORDER BY perioden_start", nativeQuery = true)
    List<Object[]> zaehleBesucheNachPeriodeAlleTeams(@Param("einheit") String einheit,
                                                     @Param("von") LocalDate von,
                                                     @Param("bis") LocalDate bis);

    @Query(value = "SELECT t.id AS team_id, t.name AS team_name, " +
            "COUNT(*) AS besuche, COUNT(DISTINCT v.mitglied_id) AS verschiedene_mitglieder " +
            "FROM besuch_log v JOIN teammitglied m ON m.id = v.mitglied_id JOIN team t ON t.id = m.team_id " +
            "WHERE v.besuch_datum >= :von AND v.besuch_datum < :bis " +
            "GROUP BY t.id, t.name", nativeQuery = true)
    List<Object[]> zaehleBesucheNachTeam(@Param("von") LocalDate von,
                                         @Param("bis") LocalDate bis);
}
