package de.gassi.repository;

import de.gassi.domain.Team;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TeamRepository extends JpaRepository<Team, Long> {

    boolean existsByNameIgnoreCase(String name);

    Optional<Team> findByNameIgnoreCase(String name);
}
