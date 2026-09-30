package de.gassi.repository;

import de.gassi.domain.PasswortResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PasswortResetTokenRepository extends JpaRepository<PasswortResetToken, Long> {

    Optional<PasswortResetToken> findByToken(String token);

    void deleteByMitgliedId(Long mitgliedId);
}
