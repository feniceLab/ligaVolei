import { createClient } from '@/lib/supabase/server'
import ValoresClient from './valores-client'

export default async function ValoresPage() {
  const supabase = await createClient()

  const [{ data: competicoes }, { data: arbitros }, { data: valores }] = await Promise.all([
    supabase.from('competicoes').select('id, nome, temporada').order('data_inicio', { ascending: false }),
    supabase.from('profiles').select('categoria').eq('role', 'arbitro').eq('ativo', true),
    supabase.from('competicao_valores').select('id, competicao_id, categoria, valor'),
  ])

  // Categorias reais dos árbitros + PADRAO (fallback usado na escalação)
  const cats = new Set<string>(['PADRAO'])
  for (const a of arbitros ?? []) if (a.categoria) cats.add(a.categoria)
  const categorias = ['PADRAO', ...[...cats].filter(c => c !== 'PADRAO').sort()]

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange-deep">Financeiro</p>
        <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-primary">Tabela de Valores</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Quanto cada categoria recebe por jogo, em cada competição. É esse valor que fica congelado na escalação.
          <span className="ml-1 font-medium text-on-surface-variant">Use <strong>PADRAO</strong> como valor-base quando a categoria não tiver linha própria.</span>
        </p>
      </div>
      <ValoresClient competicoes={competicoes ?? []} categorias={categorias} valores={valores ?? []} />
    </div>
  )
}
