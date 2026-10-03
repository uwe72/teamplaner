import { useState, useCallback, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import HeroSection from './HeroSection'
import { aktivesTeamId, aktivesTeamName } from '../api/client'

const SIDEBAR_COLLAPSED_KEY = 'gassi-sidebar-collapsed'

function sidebarStandardEingeklappt(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 1200
}

export default function Layout({ istAdmin, istSuper }: { istAdmin: boolean; istSuper: boolean }) {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
    return sidebarStandardEingeklappt()
  })
  const [alsTeam, setAlsTeam] = useState<string | null>(null)
  const [hatTeam, setHatTeam] = useState(false)

  useEffect(() => {
    setAlsTeam(istSuper && aktivesTeamId() != null ? aktivesTeamName() : null)
    setHatTeam(aktivesTeamId() != null)
  }, [istSuper, mobileOpen])

  useEffect(() => {
    const onResize = () => {
      if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) == null) {
        setCollapsed(sidebarStandardEingeklappt())
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleToggleCollapse = (next: boolean) => {
    setCollapsed(next)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
  }

  const handleCloseMobile = useCallback(() => setMobileOpen(false), [])

  function kontextVerlassen() {
    localStorage.removeItem('alsTeam')
    navigate('/super')
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-background">
      {istSuper && alsTeam && (
        <div className="relative z-40 bg-warning text-warning-foreground text-xs font-medium px-4 py-1.5 flex items-center justify-between"
          style={{ backgroundColor: 'var(--color-warning)', color: '#fff' }}>
          <span>Als-Team: <b>{alsTeam}</b> — du arbeitest im Kontext dieses Teams.</span>
          <button className="underline" onClick={kontextVerlassen}>Kontext verlassen</button>
        </div>
      )}
      <HeroSection collapsed={collapsed} onMenuClick={() => setMobileOpen(true)} />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
          mobileOpen={mobileOpen}
          onCloseMobile={handleCloseMobile}
          istAdmin={istAdmin}
          istSuper={istSuper}
          hatTeam={hatTeam}
        />

        <main
          className="flex-1 min-w-0 overflow-y-auto md:px-8 md:py-6"
          style={{ background: 'var(--tp-ground)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="w-full max-w-[1480px] mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
