package de.gassi.repository;

import de.gassi.domain.Aufgabe;
import de.gassi.domain.Zeitfenster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AufgabeRepository extends JpaRepository<Aufgabe, Long> {

    boolean existsByZeitfensterIdAndNameIgnoreCase(Long zeitfensterId, String name);

    List<Aufgabe> findByZeitfensterIdAndAktivTrueOrderByPositionAsc(Long zeitfensterId);

    List<Aufgabe> findByZeitfensterIdOrderByPositionAsc(Long zeitfensterId);

    List<Aufgabe> findByZeitfensterInAndAktivTrueOrderByZeitfensterPositionAscPositionAsc(List<Zeitfenster> zeitfenster);

    List<Aufgabe> findByZeitfensterBereichIdAndAktivTrue(Long bereichId);

    List<Aufgabe> findByZeitfensterInOrderByZeitfensterPositionAscPositionAsc(List<Zeitfenster> zeitfenster);

    List<Aufgabe> findByZeitfensterBereichIdOrderByPositionAsc(Long bereichId);
}
