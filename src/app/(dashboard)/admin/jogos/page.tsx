import { createClient } from '@/lib/supabase/server'
import JogosClient from './jogos-client'

export default async function JogosPage() {
  const supabase = await createClient()

  const [{ data: jogos }, { data: competicoes }] = await Promise.all([
    supabase.from('jogos')
      .select('*, competicao:competicoes(nome, categoria), escalacoes(id)')
      .order('data', { ascending: true })
      .order('horario', { ascending: true }),
    supabase.from('competicoes').select('id, nome, categoria').eq('ativo', true).order('nome'),
  ])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange-deep">Agenda</p>
          <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-primary">Jogos</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Gerencie os jogos das competições</p>
        </div>
      </div>
      <JogosClient jogos={jogos ?? []} competicoes={competicoes ?? []} />
    </div>
  )
}
