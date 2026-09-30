package de.gassi.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
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
@EqualsAndHashCode(exclude = {"bereich", "mitglied"})
@ToString(exclude = {"bereich", "mitglied"})
@Entity
@Table(name = "soll",
    uniqueConstraints = @UniqueConstraint(name = "uc_soll_bereich_mitglied",
        columnNames = {"bereich_id", "mitglied_id"}))
public class Soll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bereich_id", nullable = false)
    private Bereich bereich;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mitglied_id", nullable = false)
    private Teammitglied mitglied;

    @Column(name = "wert", nullable = false)
    private int wert;
}
