import { Navigate } from 'react-router-dom'
import { sitzungLaden } from '../api/client'
import type { Rolle } from '../types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: Rolle
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const sitzung = sitzungLaden()

  if (!sitzung) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole === 'SUPER_ADMIN' && sitzung.person.rolle !== 'SUPER_ADMIN') {
    return <Navigate to="/plan" replace />
  }

  if (requiredRole === 'ADMIN' && sitzung.person.rolle !== 'ADMIN' && sitzung.person.rolle !== 'SUPER_ADMIN') {
    return <Navigate to="/plan" replace />
  }

  return <>{children}</>
}
