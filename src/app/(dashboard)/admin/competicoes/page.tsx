import { createClient } from '@/lib/supabase/server'
import CompeticoesClient from './competicoes-client'

export default async function CompeticoesPage() {
  const supabase = await createClient()
  const { data: competicoes } = await supabase
    .from('competicoes')
    .select('*')
    .order('data_inicio', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange-deep">Gestão</p>
          <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-primary">Competições</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Gerencie as competições da liga</p>
        </div>
      </div>
      <CompeticoesClient competicoes={competicoes ?? []} />
    </div>
  )
}
