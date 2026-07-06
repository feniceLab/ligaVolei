import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import FichaClient, { type EscalacaoFicha, type EventoFicha } from './ficha-client'
import type { Profile, ArbitroDocumento } from '@/types'

export default async function FichaArbitroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: arbitro } = await supabase
    .from('profiles').select('*').eq('id', id).eq('role', 'arbitro').single()
  if (!arbitro) notFound()

  const [{ data: escs }, { data: eventos }, { data: docs }, { data: config }] = await Promise.all([
    supabase.from('escalacoes')
      .select('id, funcao, status, valor, pago, pago_em, escalado_em, respondido_em, motivo_recusa, jogo:jogos(data, mandante, visitante, competicao:competicoes(nome))')
      .eq('arbitro_id', id).order('escalado_em', { ascending: false }),
    supabase.from('escalacao_eventos')
      .select('id, acao, valor, motivo, criado_em, jogo:jogos(mandante, visitante, data)')
      .eq('arbitro_id', id).order('criado_em', { ascending: false }).limit(120),
    supabase.from('arbitro_documentos').select('*').eq('arbitro_id', id).order('criado_em', { ascending: false }),
    supabase.from('configuracoes').select('chave, valor'),
  ])

  // normaliza joins aninhados
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flat = (e: any): EscalacaoFicha => {
    const j = Array.isArray(e.jogo) ? e.jogo[0] : e.jogo
    const comp = j?.competicao
    return {
      id: e.id, funcao: e.funcao ?? 'arbitro', status: e.status ?? 'pendente',
      valor: e.valor, pago: e.pago, pago_em: e.pago_em, escalado_em: e.escalado_em,
      respondido_em: e.respondido_em, motivo_recusa: e.motivo_recusa,
      data: j?.data ?? '', mandante: j?.mandante ?? '', visitante: j?.visitante ?? '',
      competicao: (Array.isArray(comp) ? comp[0]?.nome : comp?.nome) ?? '',
    }
  }
  const escalacoes = (escs ?? []).map(flat)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventosFicha: EventoFicha[] = (eventos ?? []).map((ev: any) => {
    const j = Array.isArray(ev.jogo) ? ev.jogo[0] : ev.jogo
    return {
      id: ev.id, acao: ev.acao, valor: ev.valor, motivo: ev.motivo, criado_em: ev.criado_em,
      jogo: j ? `${j.mandante} × ${j.visitante}` : '', data: j?.data ?? '',
    }
  })

  const cfg: Record<string, string> = Object.fromEntries((config ?? []).map(c => [c.chave, c.valor]))
  const descontoPct = (Number(cfg.desconto_inss) || 0) + (Number(cfg.desconto_iss) || 0)

  // métricas
  const confirmadas = escalacoes.filter(e => e.status === 'confirmada')
  const recusadas = escalacoes.filter(e => e.status === 'recusada')
  const respostas = confirmadas.length + recusadas.length
  const metrics = {
    totalEscalacoes: escalacoes.length,
    confirmadas: confirmadas.length,
    recusadas: recusadas.length,
    pendentes: escalacoes.filter(e => e.status === 'pendente').length,
    taxaAceite: respostas ? Math.round((confirmadas.length / respostas) * 100) : null,
    jogosFeitos: confirmadas.length,
    totalRecebido: confirmadas.filter(e => e.pago).reduce((s, e) => s + Number(e.valor || 0), 0),
    aReceber: confirmadas.filter(e => !e.pago).reduce((s, e) => s + Number(e.valor || 0), 0),
    descontoPct,
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/arbitros" className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant transition-colors hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Voltar aos árbitros
      </Link>
      <FichaClient
        arbitro={arbitro as Profile}
        escalacoes={escalacoes}
        eventos={eventosFicha}
        documentos={(docs ?? []) as ArbitroDocumento[]}
        metrics={metrics}
      />
    </div>
  )
}
