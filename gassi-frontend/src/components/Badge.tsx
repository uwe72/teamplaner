interface BadgeProps {
  children: React.ReactNode
  variant?:
    | 'accent'
    | 'soft'
    | 'success'
    | 'danger'
    | 'warning'
    | 'muted'
    | 'solid'
}

const variantClasses: Record<string, string> = {
  accent: 'bg-primary/15 text-primary rounded-badge',
  soft: 'bg-accent-soft text-accent-hover rounded-badge',
  success: 'bg-success/15 text-success rounded-badge',
  danger: 'bg-danger/15 text-danger rounded-badge',
  warning: 'bg-warning/15 text-warning rounded-badge',
  muted: 'bg-elevated text-muted rounded-badge',
  solid: 'bg-primary text-primary-foreground rounded-badge',
}

export default function Badge({ children, variant = 'accent', bordered = false }: BadgeProps & { bordered?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center h-6 px-2.5 text-xs font-medium leading-none whitespace-nowrap ${bordered ? 'border border-border-hover' : ''} ${variantClasses[variant]}`}
    >
      {children}
    </span>
  )
}
