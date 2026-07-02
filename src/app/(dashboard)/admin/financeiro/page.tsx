import { createClient } from '@/lib/supabase/server'
import FinanceiroClient, { type EscFin } from './financeiro-client'

export default async function FinanceiroAdminPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('escalacoes')
    .select('id, valor, pago, pago_em, status, arbitro:profiles(id, nome), jogo:jogos(data, mandante, visitante, competicao:competicoes(nome))')
    .eq('status', 'confirmada')
    .order('pago', { ascending: true })

  // Normaliza joins (podem vir como objeto ou array)
  const escalacoes: EscFin[] = (data ?? []).map((e) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a: any = Array.isArray(e.arbitro) ? e.arbitro[0] : e.arbitro
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j: any = Array.isArray(e.jogo) ? e.jogo[0] : e.jogo
    const comp = j?.competicao
    return {
      id: e.id,
      valor: e.valor,
      pago: e.pago,
      pago_em: e.pago_em,
      arbitro_id: a?.id ?? '',
      arbitro_nome: a?.nome ?? '—',
      data: j?.data ?? '',
      mandante: j?.mandante ?? '',
      visitante: j?.visitante ?? '',
      competicao: (Array.isArray(comp) ? comp[0]?.nome : comp?.nome) ?? '',
    }
  }).filter(e => e.arbitro_id)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange-deep">Financeiro</p>
        <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-primary">Pagamentos</h1>
        <p className="mt-1 text-sm text-on-surface-variant">A pagar e já pago por árbitro. Marque como pago ao quitar.</p>
      </div>
      <FinanceiroClient escalacoes={escalacoes} />
    </div>
  )
}
