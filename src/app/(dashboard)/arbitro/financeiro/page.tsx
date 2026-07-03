import { createClient } from '@/lib/supabase/server'
import { Wallet, CheckCircle2, Clock } from 'lucide-react'
import { FUNCAO_LABEL, type FuncaoArbitragem } from '@/types'

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function ArbitroFinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles').select('id, nome').eq('user_id', user.id).single()

  const [{ data: escs }, { data: config }] = await Promise.all([
    supabase
      .from('escalacoes')
      .select('id, valor, funcao, pago, pago_em, jogo:jogos(data, mandante, visitante, competicao:competicoes(nome))')
      .eq('arbitro_id', profile?.id)
      .eq('status', 'confirmada')
      .order('pago', { ascending: true }),
    supabase.from('configuracoes').select('chave, valor'),
  ])

  const cfg: Record<string, string> = Object.fromEntries((config ?? []).map(c => [c.chave, c.valor]))
  const descontoPct = (Number(cfg.desconto_inss) || 0) + (Number(cfg.desconto_iss) || 0)
  const liq = (v: number) => v * (1 - descontoPct / 100)

  type Row = { id: string; valor: number | null; funcao: FuncaoArbitragem; pago: boolean; pago_em: string | null; jogo: { data: string; mandante: string; visitante: string; competicao: { nome: string } | null } | null }
  const linhas = (escs ?? []) as unknown as Row[]

  const aReceber = linhas.filter(l => !l.pago).reduce((s, l) => s + Number(l.valor ?? 0), 0)
  const jaRecebido = linhas.filter(l => l.pago).reduce((s, l) => s + Number(l.valor ?? 0), 0)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange-deep">Meu Painel</p>
        <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-primary">Financeiro</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Seus valores por jogo confirmado</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-brand-orange/20 bg-brand-orange/5 p-6 shadow-editorial">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            <Wallet className="h-4 w-4 text-brand-orange-deep" /> A receber
          </p>
          <p className="mt-3 font-headline text-4xl font-extrabold tracking-tight text-brand-orange-deep">{brl(aReceber)}</p>
          {descontoPct > 0 && <p className="mt-1 text-xs text-on-surface-variant">líquido ≈ {brl(liq(aReceber))} (após {descontoPct}% de INSS+ISS)</p>}
        </div>
        <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-editorial">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> Já recebido
          </p>
          <p className="mt-3 font-headline text-4xl font-extrabold tracking-tight text-green-700">{brl(jaRecebido)}</p>
          {descontoPct > 0 && jaRecebido > 0 && <p className="mt-1 text-xs text-on-surface-variant">líquido ≈ {brl(liq(jaRecebido))}</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-editorial">
        <div className="border-b border-outline-variant/10 px-6 py-4">
          <h2 className="font-headline text-lg font-bold text-primary">Histórico</h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">Jogos confirmados e status de pagamento</p>
        </div>
        <div className="p-4 sm:p-6">
          {linhas.length === 0 ? (
            <p className="py-8 text-center text-sm text-on-surface-variant">Você ainda não tem jogos confirmados com valor.</p>
          ) : (
            <div className="space-y-2">
              {linhas.map((l) => {
                const j = l.jogo
                if (!j) return null
                const comp = j.competicao
                const compNome = Array.isArray(comp) ? comp[0]?.nome : comp?.nome
                return (
                  <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/10 bg-surface px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-on-surface">{j.mandante} × {j.visitante}</p>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">{FUNCAO_LABEL[l.funcao ?? 'arbitro']}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        {j.data ? new Date(j.data + 'T00:00:00').toLocaleDateString('pt-BR') : ''} · {compNome ?? ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-right">
                        <span className={`block text-sm font-bold ${l.pago ? 'text-green-700' : 'text-brand-orange-deep'}`}>{brl(Number(l.valor ?? 0))}</span>
                        {descontoPct > 0 && <span className="block text-[10px] text-on-surface-variant">líq. {brl(liq(Number(l.valor ?? 0)))}</span>}
                      </span>
                      {l.pago ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-600/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-700">
                          <CheckCircle2 size={10} /> Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-orange-deep">
                          <Clock size={10} /> A receber
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
