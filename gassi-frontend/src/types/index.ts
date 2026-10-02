export type Rolle = 'SUPER_ADMIN' | 'ADMIN' | 'MITGLIED'

export interface Team {
  id: number
  name: string
  aktiv: boolean
  erstelltAm: string
  mitgliederAnzahl: number
}

export interface Teammitglied {
  id: number
  login: string
  email: string
  anzeigename: string
  rolle: Rolle
  aktiv: boolean
  teamId: number | null
  teamName: string | null
  avatarUrl: string | null
}

export interface Bereich {
  id: number
  name: string
  aktiv: boolean
  position: number
}

export interface Zeitfenster {
  id: number
  bereichId: number
  name: string
  aktiv: boolean
  position: number
}

export interface Aufgabe {
  id: number
  zeitfensterId: number
  name: string
  aktiv: boolean
  position: number
}

export interface Zuteilung {
  id: number | null
  aufgabeId: number
  mitgliedId: number | null
  anzeigename: string | null
  datum: string
}

export interface MitgliedPlanInfo {
  id: number
  anzeigename: string
  soll: number
  ist: number
  sollUnterschritten: boolean
  avatarUrl: string | null
}

export interface PlanDto {
  teamId: number
  isoJahr: number
  isoWoche: number
  bereichId: number
  bereichName: string
  tage: string[]
  mitglieder: MitgliedPlanInfo[]
  gruppen: ZeitfensterGruppe[]
}

export interface ZeitfensterGruppe {
  zeitfensterId: number
  zeitfensterName: string
  position: number
  zeilen: PlanZeile[]
}

export interface PlanZeile {
  aufgabe: Aufgabe
  zuteilungen: Zuteilung[]
}

export interface SollEintrag {
  mitgliedId: number
  anzeigename: string
  aktiv: boolean
  wert: number
}

export interface SollListe {
  bereichId: number
  aufkommenProWoche: number
  sollSumme: number
  summenwarnung: boolean
  eintraege: SollEintrag[]
}

export interface StatistikZeile {
  mitgliedId: number
  anzeigename: string
  aktiv: boolean
  ist: number
  moeglich: number
  prozent: number
}

export interface Statistik {
  bereichId: number
  bereichName: string
  wochenweise: StatistikZeile[]
  monatlich: StatistikZeile[]
  kumuliert: StatistikZeile[]
}

export interface AuthAntwort {
  token: string
  refreshToken: string
  id: number
  login: string
  anzeigename: string
  rolle: Rolle
  teamId: number | null
  teamName: string | null
  teamOeffen: boolean
  avatarUrl?: string | null
}

export interface Profil {
  id: number
  login: string
  email: string
  anzeigename: string
  rolle: Rolle
  teamId: number | null
  teamName: string | null
  avatarUrl: string | null
}

export interface SystemKonfiguration {
  werte: Record<string, string>
}

export interface FehlerAntwort {
  code: string
  message: string
}
