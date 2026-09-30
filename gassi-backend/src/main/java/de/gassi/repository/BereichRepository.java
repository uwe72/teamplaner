package de.gassi.repository;

import de.gassi.domain.Bereich;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BereichRepository extends JpaRepository<Bereich, Long> {

    boolean existsByTeamIdAndNameIgnoreCase(Long teamId, String name);

    List<Bereich> findByTeamIdAndAktivTrueOrderByPositionAsc(Long teamId);

    List<Bereich> findByTeamIdOrderByPositionAsc(Long teamId);
}
