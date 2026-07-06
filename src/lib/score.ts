export type ArbitroStats = {
  arbitro_id: string
  confirmadas: number
  recusadas: number
  pendentes: number
  jogos_feitos: number
  disp_marcadas: number
  faltas?: number
  flip_flops?: number
  valor_medio_recusadas: number
  valor_medio_confirmadas: number
}

// Pesos calibráveis da nota (vêm de configuracoes; default abaixo)
export type PesosNota = {
  aceite: number   // pontos da taxa de aceite
  disp: number     // bônus disponibilidade proativa
  eng: number      // bônus jogos feitos
  base: number     // base neutra
  penFlip: number  // penalidade por furada (marcou e desmarcou)
  penRecusa: number
  penFalta: number
}
export const PESOS_PADRAO: PesosNota = { aceite: 40, disp: 15, eng: 15, base: 30, penFlip: 8, penRecusa: 4, penFalta: 12 }

export function pesosDeConfig(cfg: Record<string, string>): PesosNota {
  const n = (k: string, d: number) => { const v = Number(cfg[k]); return Number.isFinite(v) ? v : d }
  return {
    aceite: n('nota_peso_aceite', PESOS_PADRAO.aceite),
    disp: n('nota_bonus_disp', PESOS_PADRAO.disp),
    eng: n('nota_bonus_eng', PESOS_PADRAO.eng),
    base: n('nota_base', PESOS_PADRAO.base),
    penFlip: n('nota_pen_flip', PESOS_PADRAO.penFlip),
    penRecusa: n('nota_pen_recusa', PESOS_PADRAO.penRecusa),
    penFalta: n('nota_pen_falta', PESOS_PADRAO.penFalta),
  }
}

export type Motivo = { txt: string; delta: number }
export type NotaResult = {
  nota: number        // 0-100
  estrelas: number    // 1-5
  taxaAceite: number | null
  motivos: Motivo[]   // breakdown do "por quê"
  cherry: boolean     // tende a recusar jogos baratos
  novo: boolean       // sem histórico ainda
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

// Nota de confiabilidade (0-100), ADVISORY, admin-only.
// Sobe com: aceitar quando escalado, se disponibilizar, apitar.
// Desce com: recusar, e principalmente marcar-e-desmarcar (furada) e faltar.
export function notaArbitro(s: ArbitroStats, pesos: PesosNota = PESOS_PADRAO): NotaResult {
  const confirmadas = s.confirmadas ?? 0
  const recusadas = s.recusadas ?? 0
  const faltas = s.faltas ?? 0
  const flips = s.flip_flops ?? 0
  const respostas = confirmadas + recusadas
  const novo = respostas === 0 && (s.disp_marcadas ?? 0) === 0 && (s.jogos_feitos ?? 0) === 0
  const taxaAceite = respostas > 0 ? confirmadas / respostas : null
  const taxa = taxaAceite ?? 0.6 // neutro
  const dispNorm = Math.min(s.disp_marcadas ?? 0, 20) / 20
  const engNorm = Math.min(s.jogos_feitos ?? 0, 20) / 20

  const pAceite = pesos.aceite * taxa
  const pDisp = pesos.disp * dispNorm
  const pEng = pesos.eng * engNorm
  const dFlip = -Math.min(flips * pesos.penFlip, pesos.penFlip * 3)
  const dRecusa = -Math.min(recusadas * pesos.penRecusa, pesos.penRecusa * 4)
  const dFalta = -Math.min(faltas * pesos.penFalta, pesos.penFalta * 3)

  const nota = clamp(Math.round(pesos.base + pAceite + pDisp + pEng + dFlip + dRecusa + dFalta), 0, 100)
  const estrelas = clamp(Math.round(nota / 20), 1, 5)

  const motivos: Motivo[] = []
  if (taxaAceite != null) motivos.push({ txt: `Aceite ${Math.round(taxaAceite * 100)}% (${confirmadas}/${respostas})`, delta: Math.round(pAceite) })
  if (flips > 0) motivos.push({ txt: `${flips} furada${flips > 1 ? 's' : ''} (marcou e desmarcou)`, delta: Math.round(dFlip) })
  if (faltas > 0) motivos.push({ txt: `${faltas} falta${faltas > 1 ? 's' : ''} (confirmou e não foi)`, delta: Math.round(dFalta) })
  if (recusadas > 0) motivos.push({ txt: `${recusadas} recusa${recusadas > 1 ? 's' : ''}`, delta: Math.round(dRecusa) })
  if ((s.disp_marcadas ?? 0) > 0) motivos.push({ txt: `Disponibilizou-se ${s.disp_marcadas}×`, delta: Math.round(pDisp) })
  if ((s.jogos_feitos ?? 0) > 0) motivos.push({ txt: `${s.jogos_feitos} jogos apitados`, delta: Math.round(pEng) })

  const cherry =
    recusadas >= 2 &&
    (s.valor_medio_recusadas ?? 0) > 0 &&
    (s.valor_medio_confirmadas ?? 0) > 0 &&
    s.valor_medio_recusadas < s.valor_medio_confirmadas

  return { nota, estrelas, taxaAceite, motivos, cherry, novo }
}

export function notaCor(nota: number): string {
  if (nota >= 75) return 'bg-green-600/15 text-green-700'
  if (nota >= 50) return 'bg-brand-orange/15 text-brand-orange-deep'
  return 'bg-destructive/10 text-destructive'
}

// ---- Compat: mantém a API antiga usada na escalação atual ----
export type ScoreResult = { score: number; cherry: boolean; taxaAceite: number | null; novo: boolean }
export function scoreArbitro(s: ArbitroStats): ScoreResult {
  const n = notaArbitro(s)
  return { score: n.nota, cherry: n.cherry, taxaAceite: n.taxaAceite, novo: n.novo }
}
export function scoreCor(score: number): string { return notaCor(score) }
