import { createClient } from '@/lib/supabase/server'
import ArbitrosClient from './arbitros-client'

export default async function ArbitrosPage() {
  const supabase = await createClient()
  const { data: arbitros } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'arbitro')
    .order('nome')

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange-deep">Equipe</p>
          <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-primary">Árbitros</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Gerencie os árbitros da liga</p>
        </div>
      </div>
      <ArbitrosClient arbitros={arbitros ?? []} />
    </div>
  )
}
