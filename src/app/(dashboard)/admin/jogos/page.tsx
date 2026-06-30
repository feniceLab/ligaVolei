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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jogos</h1>
        <p className="text-muted-foreground">Gerencie os jogos das competições</p>
      </div>
      <JogosClient jogos={jogos ?? []} competicoes={competicoes ?? []} />
    </div>
  )
}
