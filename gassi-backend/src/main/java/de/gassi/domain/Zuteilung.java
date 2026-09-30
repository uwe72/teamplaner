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
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(exclude = {"aufgabe", "mitglied"})
@ToString(exclude = {"aufgabe", "mitglied"})
@Entity
@Table(name = "zuteilung",
    uniqueConstraints = @UniqueConstraint(name = "uc_zuteilung_aufgabe_datum",
        columnNames = {"aufgabe_id", "datum"}))
public class Zuteilung {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "aufgabe_id", nullable = false)
    private Aufgabe aufgabe;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mitglied_id", nullable = false)
    private Teammitglied mitglied;

    @Column(name = "datum", nullable = false)
    private LocalDate datum;

    @Column(name = "zugewiesen_am", nullable = false)
    private LocalDateTime zugewiesenAm;

    @Version
    private long version;
}
