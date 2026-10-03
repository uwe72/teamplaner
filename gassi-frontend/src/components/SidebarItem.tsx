import { Link, useLocation } from 'react-router-dom'

interface SidebarItemProps {
  to: string
  label: string
  icon: string
  collapsed: boolean
}

export default function SidebarItem({ to, label, icon, collapsed }: SidebarItemProps) {
  const location = useLocation()
  const isActive = location.pathname === to || to !== '/' && location.pathname.startsWith(to + '/')

  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={`relative flex items-center gap-3 px-3 h-[44px] rounded-[12px] transition-colors tp-focus
        ${isActive
          ? 'bg-sidebar-active-bg text-sidebar-active-text font-extrabold'
          : 'text-sidebar-foreground font-semibold hover:bg-sidebar-hover'}
        ${collapsed ? 'justify-center' : ''}`}
    >
      <i className={`sap-icon ${icon} text-[18px] shrink-0 ${isActive ? 'text-[var(--tp-ink)]' : 'text-sidebar-muted'}`} />
      {!collapsed && <span className="text-sm truncate">{label}</span>}
    </Link>
  )
}
