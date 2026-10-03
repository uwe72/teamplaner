# Teamplaner

PWA für Teams jeder Art (Familie, WG, Verein): plant, wer welche Aufgabe übernimmt — mit Bereichs-Tabs, Wochenplan mit Drag & Drop, Soll-Vergleich und Prozent-Statistik. Multi-Tenant: eine Instanz, viele Teams, strikt getrennte Daten.

## Konzept (Kurzfassung)

- **Hierarchie:** Team → Bereich (z. B. „Gassi") → Aufgabe (z. B. „Gassi Blue") mit Wochentag-Wiederholung. Keine Hunde als festes Konzept, keine Uhrzeiten, keine Zeitfenster-Entität.
- **Zuteilung** = (Aufgabe, Datum, Teammitglied), 1 Person pro Aufgabe+Tag. Freigabe/Überschreiben löscht sofort endgültig (kein Journal, kein Undo-Fenster).
- **Wochen** sind implizit (Kalender + Zuteilungen am Datum), Montag–Sonntag, ISO-Wochen, Datumsgrenze Mitternacht Europe/Berlin. Der Wochenplan wird frei durchgeblättert; Vergangenheit ändern nur Admins.
- **Zuteilungs-Rechte:** jedes Teammitglied darf Zuteilungen von heute und Zukunft setzen/löschen/überschreiben (auch fremde); Vergangenheit nur ADMIN/SUPER_ADMIN.
- **Soll:** Zahlenwert pro (Bereich, Teammitglied) in den Stammdaten, Summen-Warnung gegen das Wochenaufkommen; wirkt live (keine Historie).
- **Statistik ersetzt den Saldo:** Prozent pro Woche (Ist ÷ Aufkommen) und kumuliert seit Teamstart, als Tabelle + Torte, pro Bereich.
- **Rollen:** erste Registrierung = SUPER_ADMIN (Plattform-Admin, kein Team, Als-Team-Kontext für vollen Zugriff auf jedes Team, eigene `/super`-Route mit Teamverwaltung + SMTP-Konfiguration). Weitere Registrierungen öffentlich → Team-Admin + Team + Startbereich. Mitglieder legt der Team-Admin an.
- **Login:** Loginname + Passwort (kein Team-Auswahl-Schritt, keine PIN). Loginname global eindeutig, case-insensitive, max. 25 Zeichen, kein `@`. JWT Access 1 h + Refresh 30 Tage. Passwort-Reset und Login-Reminder per Mail (SMTP-Konfiguration in der DB, UUID-Token 30 min).
- **Keine Migration:** frische Datenbank, Hibernate `ddl-auto: update`, Tabellen ohne Präfix.

## Stack

Java 21 + Spring Boot 3.5 + PostgreSQL (Zonky-Embedded lokal), React 19 + TypeScript + Vite + Tailwind v4, PWA mit `vite-plugin-pwa` (Offline-Cache lesend), Web Push entfernt.

## Starten (lokal)

```bash
# Backend
cd gassi-backend
mvn test             # Tests mit Embedded Postgres (Port 15434)
mvn spring-boot:run  # Server auf :8080 (Embedded Postgres :15433)

# Frontend
cd gassi-frontend
npm install
npm run dev       # http://localhost:5173, /api wird zu :8080 geproxied
```

Erststart: Registrierungsseite öffnen — das erste Konto wird SUPER_ADMIN, danach weitere Registrierungen für Teams. SMTP für Mail-Flows im Super-Bereich konfigurieren (`system_config`).

## Produktion

GitHub Action baut auf jedem Push nach `main` ein Docker-Image (`ghcr.io/...:latest`), Tests laufen vorher. Domain bleibt `gassi.ipv64.de`. In Produktion `APP_JWT_SECRET` setzen (siehe `gassi-backend/.env.example`), sonst verfallen Tokens beim Neustart.

## Home Assistant (nur lesend)

Für die reine Anzeige auf einem Home-Assistant-Dashboard gibt es einen separaten Lese-Endpunkt, der NICHT am App-Login hängt:

- `GET /api/ha/plan/{planId}` — `planId` ist die ID aus der Frontend-Route `/plan/{id}` (Bereich-ID). Liefert immer die aktuelle Woche (Montag–Sonntag, Europe/Berlin): Team, Bereich, Kalenderwoche, Zeitfenster („Slots"), Personen mit Ist/Soll (identisch zum Fortschrittsring in der Wochenansicht), Runden je Tag/Slot mit zugewiesenen Kürzeln sowie die Anzahl offener (freier) Runden ab heute bis Sonntag. Antwort als kompaktes JSON (< 8 KB).
- `GET /api/ha/foto/{personId}?k={token}` — Profilfoto als Vorschaubild (max. 128×128, JPEG; nicht dekodierbare Formate werden unverändert ausgeliefert), `Cache-Control: max-age=86400`.

Absicherung über die Umgebungsvariable `TEAMPLANER_HA_TOKEN`:

- Plan-Endpunkt: Header `X-HA-Token: <token>`
- Foto-Endpunkt: Query-Parameter `?k=<token>` (dieselbe Umgebungsvariable)
- Falscher oder fehlender Token → `401`
- Variable leer oder nicht gesetzt → Endpunkte deaktiviert (`404`)

Beispiel für ein Docker-Compose-Snippet:

```yaml
services:
  teamplaner:
    image: ghcr.io/.../teamplaner-backend:latest
    environment:
      APP_JWT_SECRET: "<geheimer-jwt-schluessel>"
      TEAMPLANER_HA_TOKEN: "<langer-zufaelliger-token>"
```

Beispiel-Abfrage:

```bash
curl -H "X-HA-Token: $TEAMPLANER_HA_TOKEN" https://gassi.ipv64.de/api/ha/plan/1
```

In Home Assistant z. B. als `rest`-Sensor oder `rest_image`-Entität einbinden (für Fotos den Token an die URL anhängen: `/api/ha/foto/3?k=...`).

## Domänenregeln

Siehe `AGENTS.md`.
