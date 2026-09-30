package de.gassi.repository;

import de.gassi.domain.Zuteilung;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ZuteilungRepository extends JpaRepository<Zuteilung, Long> {

    Optional<Zuteilung> findByAufgabeIdAndDatum(Long aufgabeId, LocalDate datum);

    List<Zuteilung> findByAufgabeZeitfensterBereichIdAndDatumBetweenOrderByDatumAsc(Long bereichId, LocalDate von,
                                                                                    LocalDate bis);

    @Query("""
        SELECT z FROM Zuteilung z
        WHERE z.aufgabe.zeitfenster.bereich.id = :bereichId
          AND z.datum >= :von AND z.datum <= :bis
        """)
    List<Zuteilung> findImBereichImZeitraum(@Param("bereichId") Long bereichId,
                                            @Param("von") LocalDate von,
                                            @Param("bis") LocalDate bis);

    @Query("""
        SELECT COALESCE(COUNT(z.id), 0) FROM Zuteilung z
        WHERE z.mitglied.id = :mitgliedId
          AND z.aufgabe.zeitfenster.bereich.id = :bereichId
          AND z.datum >= :von AND z.datum <= :bis
        """)
    long zaehleMitgliedImBereichImZeitraum(@Param("mitgliedId") Long mitgliedId,
                                           @Param("bereichId") Long bereichId,
                                           @Param("von") LocalDate von,
                                           @Param("bis") LocalDate bis);

    @Query("""
        SELECT COALESCE(COUNT(z.id), 0) FROM Zuteilung z
        WHERE z.aufgabe.zeitfenster.bereich.id = :bereichId
          AND z.datum >= :von AND z.datum <= :bis
        """)
    long zaehleBereichImZeitraum(@Param("bereichId") Long bereichId,
                                 @Param("von") LocalDate von,
                                 @Param("bis") LocalDate bis);

    void deleteByAufgabeId(Long aufgabeId);

    void deleteByMitgliedId(Long mitgliedId);
}
