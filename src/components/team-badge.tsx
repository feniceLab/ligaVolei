import escudos from '@/lib/escudos.json'
import { cn } from '@/lib/utils'

const MAP = escudos as Record<string, string>

function initials(name: string) {
  const clean = name.replace(/[/\-].*$/, '').trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

/** Escudo (logo) do time + nome. Fallback: círculo navy com iniciais. */
export function TeamBadge({
  name,
  className,
  size = 'md',
  hideName = false,
}: {
  name: string
  className?: string
  size?: 'sm' | 'md'
  hideName?: boolean
}) {
  const key = (name ?? '').trim()
  const shield = MAP[key]
  const isReal = shield && !shield.includes('default-shield')
  const dim = size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-[11px]'

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      {isReal ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shield}
          alt=""
          className={cn('shrink-0 rounded-full bg-white object-contain ring-1 ring-outline-variant/25', dim)}
        />
      ) : (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white ring-1 ring-outline-variant/25',
            dim,
          )}
        >
          {initials(key)}
        </span>
      )}
      {!hideName && <span className="truncate font-medium">{name}</span>}
    </span>
  )
}
