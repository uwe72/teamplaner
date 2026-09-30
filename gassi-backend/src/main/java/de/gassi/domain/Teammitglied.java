package de.gassi.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(exclude = "team")
@ToString(exclude = "team")
@Entity
@Table(name = "teammitglied")
public class Teammitglied {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @Column(name = "login", nullable = false, unique = true, length = 25)
    private String login;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "passwort_hash", nullable = false)
    private String passwortHash;

    @Column(name = "anzeigename", nullable = false)
    private String anzeigename;

    @Column(name = "farbe", nullable = false)
    private String farbe;

    @Enumerated(EnumType.STRING)
    @Column(name = "rolle", nullable = false, length = 12)
    private Rolle rolle;

    @Column(name = "aktiv", nullable = false)
    @Builder.Default
    private boolean aktiv = true;
}
