package de.gassi.repository;

import de.gassi.domain.Teammitglied;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TeammitgliedRepository extends JpaRepository<Teammitglied, Long> {

    boolean existsByLoginIgnoreCase(String login);

    Optional<Teammitglied> findByLoginIgnoreCase(String login);

    List<Teammitglied> findAllByEmailIgnoreCase(String email);

    List<Teammitglied> findByTeamIdOrderByIdAsc(Long teamId);

    boolean existsByRolle(de.gassi.domain.Rolle rolle);

    long countByTeamIdAndAktivTrue(Long teamId);

    long countByAktivTrueAndTeamIsNotNull();

    @Query("SELECT m FROM Teammitglied m LEFT JOIN FETCH m.team WHERE m.id = :id")
    Optional<Teammitglied> findByIdMitTeam(@Param("id") Long id);
}
