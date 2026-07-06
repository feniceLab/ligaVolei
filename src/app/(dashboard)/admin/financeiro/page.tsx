import { createClient } from '@/lib/supabase/server'
import FinanceiroClient, { type EscFin } from './financeiro-client'
import FinanceiroBI, { type BiRow } from './financeiro-bi'
import type { FuncaoArbitragem } from '@/types'

export default async function FinanceiroAdminPage() {
  const supabase = await createClient()

  const [{ data }, { data: config }] = await Promise.all([
    supabase
      .from('escalacoes')
      .select('id, valor, funcao, pago, pago_em, status, arbitro:profiles(id, nome, categoria), jogo:jogos(data, mandante, visitante, competicao:competicoes(nome))')
      .eq('status', 'confirmada')
      .order('pago', { ascending: true }),
    supabase.from('configuracoes').select('chave, valor'),
  ])

  const cfg: Record<string, string> = Object.fromEntries((config ?? []).map(c => [c.chave, c.valor]))
  const descontoPct = (Number(cfg.desconto_inss) || 0) + (Number(cfg.desconto_iss) || 0)

  // Normaliza joins (podem vir como objeto ou array)
  const full = (data ?? []).map((e) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a: any = Array.isArray(e.arbitro) ? e.arbitro[0] : e.arbitro
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j: any = Array.isArray(e.jogo) ? e.jogo[0] : e.jogo
    const comp = j?.competicao
    return {
      id: e.id,
      valor: e.valor as number | null,
      funcao: (e.funcao ?? 'arbitro') as FuncaoArbitragem,
      pago: e.pago as boolean,
      pago_em: e.pago_em as string | null,
      arbitro_id: (a?.id ?? '') as string,
      arbitro_nome: (a?.nome ?? '—') as string,
      categoria: (a?.categoria ?? null) as string | null,
      data: (j?.data ?? '') as string,
      mandante: (j?.mandante ?? '') as string,
      visitante: (j?.visitante ?? '') as string,
      competicao: ((Array.isArray(comp) ? comp[0]?.nome : comp?.nome) ?? '') as string,
    }
  }).filter(e => e.arbitro_id)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const escalacoes: EscFin[] = full.map(({ categoria, ...rest }) => rest)
  const biRows: BiRow[] = full.map(e => ({
    arbitro_nome: e.arbitro_nome, categoria: e.categoria, funcao: e.funcao,
    valor: e.valor, pago: e.pago, data: e.data, competicao: e.competicao,
    mandante: e.mandante, visitante: e.visitante,
  }))

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange-deep">Financeiro</p>
        <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-primary">Pagamentos & Métricas</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Painel de gastos com arbitragem. Marque como pago ao quitar.</p>
      </div>
      <FinanceiroBI rows={biRows} descontoPct={descontoPct} />
      <div>
        <h2 className="mb-3 font-headline text-lg font-bold text-primary">Pagamentos por árbitro</h2>
        <FinanceiroClient escalacoes={escalacoes} descontoPct={descontoPct} />
      </div>
    </div>
  )
}
