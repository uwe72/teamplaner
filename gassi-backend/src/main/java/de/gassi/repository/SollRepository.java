package de.gassi.repository;

import de.gassi.domain.Soll;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SollRepository extends JpaRepository<Soll, Long> {

    List<Soll> findByBereichIdOrderByMitgliedAnzeigenameAsc(Long bereichId);

    Optional<Soll> findByBereichIdAndMitgliedId(Long bereichId, Long mitgliedId);

    void deleteByBereichId(Long bereichId);
}
