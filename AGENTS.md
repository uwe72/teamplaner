# AGENTS.md

This document provides guidelines for AI coding agents working in this repository.

## Project Overview

Teamplaner is a PWA that plans who takes which task in a team (family, WG, club): multi-tenant, one instance, many teams. It is built as a sibling of FFL (`C:\Projects\fflng`) and copies its structure and style.

- **Backend**: Java 21 + Spring Boot 3.5 + PostgreSQL
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS 4 (CSS-first, no tailwind.config.js)

## Build Commands

### Backend (from `gassi-backend/`)

Maven is available globally (`mvn`). One-time local setup: copy `.env.example` to `.env` if needed (set `APP_JWT_SECRET` for production; without it tokens are ephemeral per restart).

```bash
mvn compile          # Compile only
mvn test             # Run all tests (Zonky embedded PostgreSQL, port 15434)
mvn package -DskipTests
mvn clean install
```

Backend runs on `http://localhost:8080` with embedded PostgreSQL on port 15433 (profile `dev`, data in `gassi-backend/data/pg-data/`).

### Frontend (from `gassi-frontend/`)

```bash
npm install
npm run dev      # http://localhost:5173, proxies /api to :8080
npm run build    # tsc && vite build
npm run lint     # eslint, max-warnings 0
npx tsc --noEmit
```

## Code Style Guidelines

### Backend (Java/Spring Boot)

- Packages: `de.gassi.config|controller|service|repository|domain|dto|exception`
- Tables: snake_case without prefix (`team`, `teammitglied`, `bereich`, `aufgabe`, `zuteilung`, `soll`, `system_config`)
- Entities: Lombok `@Data @NoArgsConstructor @AllArgsConstructor @Builder`, `GenerationType.IDENTITY`, `@Enumerated(EnumType.STRING)`; exclude lazy relations from `@ToString`/`@EqualsAndHashCode`
- Services: constructor injection, `@Transactional` on writes; tenant context comes from the JWT (`JwtAuthenticationFilter` loads member with `JOIN FETCH team`)
- No comments in code unless explicitly requested
- Tests are sacrosanct: never remove/weaken tests to make code pass; fix the code
- Business errors: throw `BusinessFehler(code, message)` — mapped to JSON `{code, message}` by `GlobalExceptionHandler` (401 NICHT_ANGEMELDET, 403 KEINE_BERECHTIGUNG/KEIN_TEAMZUGRIFF, 409 Konflikte)
- Auth: JWT access (1 h) + refresh (30 d) from `APP_JWT_SECRET`; login = loginname + password; no session, no PIN
- No automatic git commits/pushes — only when the user explicitly asks

### Frontend (React/TypeScript)

- Components in `src/components`, pages in `src/pages`, types in `types/index.ts`, API via `api/client.ts` (axios with auto token refresh on 401) and `api/auth.ts`
- Tailwind v4 with design tokens from `src/index.css` `@theme` block — never hardcode colors or use arbitrary `text-[#...]` values; member colors come from the fixed palette in the code
- No opacity-based disabled states
- German UI text throughout
- PWA via `vite-plugin-pwa` (manifest, service worker, offline read cache); push removed

## Domain Rules (must not be broken)

- Hierarchy: Team → Bereich (unique name per team, aktiv, position with drag & drop) → Zeitfenster (unique name per team, aktiv, position = priority via drag & drop) → Aufgabe (unique name per team, aktiv, position). Aufgaben belong to a Zeitfenster and apply to all 7 days of the week — no weekday-repetition, no clock times, completely time-agnostic (only dates, Europe/Berlin, midnight boundary)
- Assignment = (Aufgabe, Datum, Teammitglied), one person per Aufgabe+Datum (`@Version`, unique constraint). Release/overwrite = delete (+ recreate), immediately final, no logbook, no undo window
- Weeks are implicit (calendar + assignments on the date), Monday–Sunday ISO weeks. Plan browsable freely; past days (datum < heute, midnight boundary) changeable only by ADMIN/SUPER_ADMIN — enforced in the backend, never only in the UI
- Every team member may assign/reassign/release any cell from today into the future (including other members' cells)
- Team members are team-wide; Soll is a number per (Bereich, Teammitglied) maintained in the Bereich detail; sum warning against weekly demand (active Aufgaben in the Bereich × 7 days × 1 week), no Soll history (live recalculation)
- Statistics replace the saldo: percentages per week and cumulative (Ist ÷ possible since team start), per Bereich, table + pie charts
- Teams: created by public registration (step 1 account → step 2 team name); first registration becomes SUPER_ADMIN (no team, `team_id null`), later ones become Team-Admin with team + startbereich. Team names unique software-wide; teams deactivated, never deleted; members/Bereiche/Zeitfenster/Aufgaben deactivated, not deleted
- Login: loginname (global unique, case-insensitive, max 25, no `@`) + password, no team selection, generic error message, no password minimum. One login = one team; same email may exist in multiple teams with separate logins (FFL-style reset flows handle multipleAccounts)
- Tenant isolation: every request carries the team context implicitly from the JWT; `/api/teams/{teamId}/...` validates membership server-side (SUPER_ADMIN passes); repository-level filtering; secured by backend tests
- Deactivated members: no login, no assignment target, but remain in history/statistics
- UI: FFL-analog — desktop (≥768px) sidebar + 7-column raster, mobile compact same raster; the plan page never shows a tabbed pane above the plan (exactly one Bereich/plan is displayed per route, Bereich selection lives in the sidebar); plan rows grouped under Zeitfenster header rows (priority order); assignment via drag & drop (Leiste → Zelle) plus click-Auswahl-Overlay; Soll-Badge (Ist/Soll, red when below) on member chips and assigned boxes
- Tabbed panes always use the `/statistik`-page style: `src/components/Tabs.tsx` (underline style — `border-b border-border`, active `text-primary border-b-2 border-primary`); do not re-implement other tab/chip variants for page-level tab switching — reuse that component analog to `StatistikSeite.tsx`
- All assignments live: renaming/Soll changes affect displayed history

## Versioning

- Git hook in `.githooks/pre-commit` bumps the patch version on every commit (package.json source of truth, pom.xml mirrors project version). After fresh clone run once: `git config core.hooksPath .githooks`

## Workflow Preferences

- No automatic git commits/pushes — only when the user explicitly requests it
- Consistent UI: maintain the established token system, spacing, card styles everywhere
- Tests accompany new features; backend tests run in CI on every push to `main`
