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
@EqualsAndHashCode(exclude = "bereich")
@ToString(exclude = "bereich")
@Entity
@Table(name = "zeitfenster")
public class Zeitfenster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bereich_id", nullable = false)
    private Bereich bereich;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "aktiv", nullable = false)
    @Builder.Default
    private boolean aktiv = true;

    @Column(name = "position", nullable = false)
    private int position;
}
