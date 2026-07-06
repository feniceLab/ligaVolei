'use client'

// Gráficos SVG/CSS próprios — zero dependência externa, temáveis no padrão LCV.

export const PALETTE = ['#132577', '#fe8933', '#4f5bd5', '#984800', '#2fbf71', '#f4ae02', '#0a1657', '#9aa0c9']

type Item = { label: string; value: number }

export function Donut({ data, unit }: { data: Item[]; unit?: (n: number) => string }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const size = 148, r = size / 2, thick = 26, rr = r - thick / 2
  const C = 2 * Math.PI * rr
  let offset = 0
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={r} cy={r} r={rr} fill="none" stroke="var(--color-surface-container-high, #ececf2)" strokeWidth={thick} />
        {total > 0 && data.map((d, i) => {
          const len = (d.value / total) * C
          const el = (
            <circle key={i} cx={r} cy={r} r={rr} fill="none" stroke={PALETTE[i % PALETTE.length]}
              strokeWidth={thick} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="min-w-0 flex-1 space-y-1">
        {total === 0 && <p className="text-xs text-on-surface-variant">sem dados</p>}
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="truncate text-on-surface-variant">{d.label}</span>
            <span className="ml-auto shrink-0 font-bold text-on-surface">{unit ? unit(d.value) : d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function HBarList({ data, unit, color = '#132577' }: { data: Item[]; unit?: (n: number) => string; color?: string }) {
  if (!data.length) return <p className="text-xs text-on-surface-variant">sem dados</p>
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between gap-2 text-xs">
            <span className="truncate text-on-surface-variant">{d.label}</span>
            <span className="shrink-0 font-bold text-on-surface">{unit ? unit(d.value) : d.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div className="h-full rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function BarsVertical({ data, unit }: { data: Item[]; unit?: (n: number) => string }) {
  if (!data.length) return <p className="text-xs text-on-surface-variant">sem dados</p>
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2" style={{ height: 170 }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[9px] font-bold text-on-surface-variant">{d.value > 0 ? (unit ? unit(d.value) : d.value) : ''}</span>
          <div className="w-full rounded-t-md bg-primary transition-all" style={{ height: `${(d.value / max) * 130}px`, minHeight: d.value > 0 ? 4 : 0 }} />
          <span className="text-[9px] text-on-surface-variant">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
