export type ArbitroStats = {
  arbitro_id: string
  confirmadas: number
  recusadas: number
  pendentes: number
  jogos_feitos: number
  disp_marcadas: number
  valor_medio_recusadas: number
  valor_medio_confirmadas: number
}

export type ScoreResult = {
  score: number
  cherry: boolean
  taxaAceite: number | null
  novo: boolean
}

// Score de confiabilidade (0-100), ADVISORY. Pesos calibráveis:
//  - 50% taxa de aceite (confirma quando escalado)
//  - 30% disponibilidade (marca disponibilidade proativamente)
//  - 20% engajamento (jogos efetivamente apitados)
// cherry-picker = recusa jogos baratos e só aceita os caros.
export function scoreArbitro(s: ArbitroStats): ScoreResult {
  const respostas = (s.confirmadas ?? 0) + (s.recusadas ?? 0)
  const novo = respostas === 0 && (s.disp_marcadas ?? 0) === 0 && (s.jogos_feitos ?? 0) === 0
  const taxaAceite = respostas > 0 ? s.confirmadas / respostas : null
  const taxa = taxaAceite ?? 0.6 // neutro para quem ainda não respondeu
  const disp = Math.min(s.disp_marcadas ?? 0, 20) / 20
  const eng = Math.min(s.jogos_feitos ?? 0, 20) / 20
  const score = Math.round((taxa * 0.5 + disp * 0.3 + eng * 0.2) * 100)
  const cherry =
    (s.recusadas ?? 0) >= 2 &&
    (s.valor_medio_recusadas ?? 0) > 0 &&
    (s.valor_medio_confirmadas ?? 0) > 0 &&
    s.valor_medio_recusadas < s.valor_medio_confirmadas
  return { score, cherry, taxaAceite, novo }
}

export function scoreCor(score: number): string {
  if (score >= 75) return 'bg-green-600/15 text-green-700'
  if (score >= 50) return 'bg-brand-orange/15 text-brand-orange-deep'
  return 'bg-destructive/10 text-destructive'
}
