import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useSitzung } from './api/client'
import Login from './pages/Login'
import Registrierung from './pages/Registrierung'
import TeamRegistrierung from './pages/TeamRegistrierung'
import PasswortVergessen from './pages/PasswortVergessen'
import LoginnameVergessen from './pages/LoginnameVergessen'
import PasswortZuruecksetzen from './pages/PasswortZuruecksetzen'
import Plan from './pages/Plan'
import Verwaltung from './pages/Verwaltung'
import StatistikSeite from './pages/StatistikSeite'
import ProfilSeite from './pages/Profil'
import Super from './pages/Super'
import useBereiche from './hooks/useBereiche'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  const sitzung = useSitzung()
  const person = sitzung?.person ?? null
  const istAdmin = person?.rolle === 'ADMIN' || person?.rolle === 'SUPER_ADMIN'
  const istSuper = person?.rolle === 'SUPER_ADMIN'

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={person ? <RedirectNachLogin person={person} /> : <Login />} />
        <Route path="/registrierung" element={person ? <RedirectNachLogin person={person} /> : <Registrierung />} />
        <Route path="/registrierung/team" element={<TeamRegistrierung />} />
        <Route path="/passwort-vergessen" element={<PasswortVergessen />} />
        <Route path="/loginname-vergessen" element={<LoginnameVergessen />} />
        <Route path="/passwort-zuruecksetzen" element={<PasswortZuruecksetzen />} />

        <Route path="/" element={
          person
            ? <Layout istAdmin={istAdmin} istSuper={istSuper} />
            : <Navigate to="/login" replace />
        }>
          <Route index element={<Navigate to={istSuper ? '/super' : '/plan'} replace />} />
          <Route path="plan" element={<ProtectedRoute><PlanRedirect /></ProtectedRoute>} />
          <Route path="plan/:bereichId" element={<ProtectedRoute><Plan /></ProtectedRoute>} />
          <Route path="verwaltung" element={<Navigate to="/verwaltung/teammitglieder" replace />} />
          <Route path="verwaltung/teammitglieder" element={
            <ProtectedRoute requiredRole="ADMIN"><Verwaltung tab="mitglieder" /></ProtectedRoute>
          } />
          <Route path="verwaltung/bereiche" element={
            <ProtectedRoute requiredRole="ADMIN"><Verwaltung tab="bereiche" /></ProtectedRoute>
          } />
          <Route path="statistik" element={<ProtectedRoute><StatistikSeite /></ProtectedRoute>} />
          <Route path="profil" element={<ProtectedRoute><ProfilSeite /></ProtectedRoute>} />
          <Route path="super" element={
            <ProtectedRoute requiredRole="SUPER_ADMIN"><Super /></ProtectedRoute>
          } />
        </Route>
        <Route path="*" element={<Navigate to={person ? (istSuper ? '/super' : '/plan') : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function RedirectNachLogin({ person }: { person: { rolle: string; teamId: number | null } }) {
  if (person.rolle === 'SUPER_ADMIN') {
    return <Navigate to="/super" replace />
  }
  if (person.teamId == null) {
    return <Navigate to="/registrierung/team" replace />
  }
  return <Navigate to="/plan" replace />
}

function PlanRedirect() {
  const navigate = useNavigate()
  const { data: bereiche, isLoading } = useBereiche()
  const aktive = (bereiche ?? []).filter(b => b.aktiv)
  const ersteAktive = aktive[0]

  useEffect(() => {
    if (!isLoading && ersteAktive) {
      navigate(`/plan/${ersteAktive.id}`, { replace: true })
    }
  }, [isLoading, ersteAktive, navigate])

  if (!isLoading && ersteAktive) return null
  return <Plan />
}
