import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import SidebarItem from './SidebarItem'
import { sitzungLaden, sitzungLoeschen } from '../api/client'
import useBereiche from '../hooks/useBereiche'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: (next: boolean) => void
  mobileOpen: boolean
  onCloseMobile: () => void
  istAdmin: boolean
  istSuper: boolean
  hatTeam: boolean
}

function buildDateTimeLabel(): string {
  const raw = import.meta.env.VITE_BUILD_DATE as string | undefined
  if (!raw) return ''
  const d = new Date(raw)
  const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return `V${date} - ${time}`
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, istAdmin, istSuper, hatTeam }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const person = sitzungLaden()?.person
  const bereicheAbfrage = useBereiche()
  const aktiveBereiche = (bereicheAbfrage.data ?? [])
    .filter(b => b.aktiv)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  useEffect(() => {
    onCloseMobile()
  }, [location.pathname, onCloseMobile])

  const handleLogout = () => {
    sitzungLoeschen()
    navigate('/login')
    window.location.reload()
  }

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <nav className="flex-1 px-2 py-4 flex flex-col gap-1 overflow-y-auto">
        {istSuper && (
          <SidebarItem to="/super" label="Übersicht" icon="sap-icon-manager" collapsed={collapsed} />
        )}
        {hatTeam && aktiveBereiche.length === 0 && (
          <SidebarItem to="/plan" label="Plan" icon="sap-icon-calendar" collapsed={collapsed} />
        )}
        {hatTeam && aktiveBereiche.map(b => (
          <SidebarItem key={b.id} to={`/plan/${b.id}`} label={b.name} icon="sap-icon-calendar" collapsed={collapsed} />
        ))}
        {hatTeam && istAdmin && (
          <SidebarItem to="/verwaltung/bereiche" label="Bereiche" icon="sap-icon-grid" collapsed={collapsed} />
        )}
        {hatTeam && istAdmin && (
          <SidebarItem to="/verwaltung/teammitglieder" label="Team" icon="sap-icon-employee" collapsed={collapsed} />
        )}
        {hatTeam && (
          <SidebarItem to="/statistik" label="Statistik" icon="sap-icon-bar-chart" collapsed={collapsed} />
        )}
        <SidebarItem to="/profil" label="Profil" icon="sap-icon-user-settings" collapsed={collapsed} />
      </nav>

      <div className={`px-3 py-3 border-t border-border ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {collapsed ? (
          <>
            <div className="w-8 h-8 rounded-full bg-accent-muted text-accent flex items-center justify-center text-xs font-bold">
              {person?.anzeigename?.charAt(0).toUpperCase() || 'U'}
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-control text-subtle hover:text-danger hover:bg-danger/10 transition-colors"
              title="Abmelden"
            >
              <i className="sap-icon sap-icon-log text-[18px]" />
            </button>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold bg-accent-muted text-accent"
              >
                {person?.anzeigename?.charAt(0).toUpperCase() || 'U'}
              </div>
              <Link to="/profil" className="text-sm text-sidebar-foreground truncate hover:text-sidebar-muted hover:underline cursor-pointer">{person?.anzeigename ?? 'Gast'}</Link>
            </div>
            <button
              onClick={handleLogout}
              className="px-2 py-1 text-xs rounded-control bg-elevated text-foreground border border-border-hover hover:bg-default transition-colors shrink-0"
            >
              Abmelden
            </button>
          </div>
        )}
      </div>

      <div className={`px-2 py-2 border-t border-border ${collapsed ? 'flex flex-col items-center gap-1' : 'flex items-center justify-between gap-2'}`}>
        {!collapsed && (
          <span className="text-sm text-muted">
            {buildDateTimeLabel()}
          </span>
        )}
        <button
          onClick={() => onToggleCollapse(!collapsed)}
          className="p-2 rounded-control text-subtle hover:text-muted hover:bg-card-hover transition-colors"
          title={collapsed ? 'Sidebar öffnen' : 'Sidebar schließen'}
        >
          <i className={`sap-icon sap-icon-navigation-left-arrow text-[20px] transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside
        className={`sidebar hidden md:flex flex-col bg-surface border-r border-border shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out`}
        style={{ width: collapsed ? 64 : 240 }}
      >
        {renderSidebarContent()}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-overlay" onClick={onCloseMobile} />
          <aside className="sidebar absolute left-0 top-0 bottom-0 w-60 bg-surface border-r border-border flex flex-col shadow-2xl">
            {renderSidebarContent()}
          </aside>
        </div>
      )}
    </>
  )
}
