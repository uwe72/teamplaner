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
      className={`relative flex items-center gap-3 px-3 h-[38px] rounded-control transition-colors tp-focus
        ${isActive
          ? 'bg-sidebar-active-bg text-sidebar-active-text font-semibold'
          : 'text-sidebar-muted font-medium hover:bg-sidebar-hover hover:text-sidebar-foreground'}
        ${collapsed ? 'justify-center' : ''}`}
    >
      <i className={`sap-icon ${icon} text-[18px] shrink-0 ${isActive ? 'text-accent' : ''}`} />
      {!collapsed && <span className="text-sm truncate">{label}</span>}
    </Link>
  )
}
