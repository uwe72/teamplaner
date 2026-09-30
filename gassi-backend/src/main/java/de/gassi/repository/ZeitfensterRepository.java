package de.gassi.repository;

import de.gassi.domain.Zeitfenster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ZeitfensterRepository extends JpaRepository<Zeitfenster, Long> {

    boolean existsByBereichTeamIdAndNameIgnoreCase(Long teamId, String name);

    List<Zeitfenster> findByBereichIdAndAktivTrueOrderByPositionAsc(Long bereichId);

    List<Zeitfenster> findByBereichIdOrderByPositionAsc(Long bereichId);
}
