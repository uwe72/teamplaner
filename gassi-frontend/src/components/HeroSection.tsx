import { useState } from 'react'
import { useMatch } from 'react-router-dom'
import Badge from './Badge'
import { aktivesTeamName, sitzungLaden } from '../api/client'
import useBereiche from '../hooks/useBereiche'
import PlanWaehlerSheet from './week/PlanWaehler'

interface HeroSectionProps {
  collapsed: boolean
  onMenuClick: () => void
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export default function HeroSection({ collapsed, onMenuClick }: HeroSectionProps) {
  const teamName = aktivesTeamName()
  const personName = sitzungLaden()?.person.anzeigename ?? 'Gast'
  const planMatch = useMatch('/plan/:bereichId')
  const bereicheAbfrage = useBereiche()
  const bereichName = planMatch
    ? (bereicheAbfrage.data ?? []).find(b => b.id === Number(planMatch.params.bereichId))?.name ?? null
    : null
  const [planWaehlerOffen, setPlanWaehlerOffen] = useState(false)

  return (
    <div className="hero relative h-[80px] md:h-[102px] shrink-0 overflow-hidden bg-header">
      <div
        className="hero-bg absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: 'url(/hero-banner.jpg)',
          filter: 'brightness(1.35) contrast(0.92)',
        }}
      />
      <div className="img-overlay" />

      <div className="relative z-10 flex h-full items-stretch">
        <div
          className="hidden md:block shrink-0 transition-[width] duration-300 ease-in-out"
          style={{ width: collapsed ? 64 : 240 }}
        />

        <div className="flex flex-1 min-w-0 items-center px-[30px]">
          <button
            onClick={onMenuClick}
            className="md:hidden mr-3 -ml-[18px] p-1.5 rounded-control text-muted hover:text-primary hover:bg-card-hover transition-colors"
          >
            <i className="sap-icon sap-icon-menu text-[20px]" />
          </button>

          <div className="flex flex-col justify-center min-w-0 hero-text-shadow">
            <p className="text-xl md:text-2xl font-bold text-foreground leading-tight pl-2.5">
              {getGreeting()}, {personName}!
            </p>
            {teamName && (
              <div className="flex items-center gap-2 mt-0.5 min-w-0">
                <Badge variant="solid">{teamName}</Badge>
                {bereichName && planMatch ? (
                  <button
                    type="button"
                    className="md:hidden cursor-pointer"
                    aria-label={`Plan wechseln — aktuell: ${bereichName}`}
                    onClick={() => setPlanWaehlerOffen(true)}
                  >
                    <Badge variant="solid">{bereichName} ▾</Badge>
                  </button>
                ) : bereichName ? (
                  <span className="hidden md:block"><Badge variant="solid">{bereichName}</Badge></span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {planMatch && bereichName && (
        <PlanWaehlerSheet offen={planWaehlerOffen} schliessen={() => setPlanWaehlerOffen(false)} />
      )}
    </div>
  )
}
