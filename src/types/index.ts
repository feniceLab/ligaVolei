export type UserRole = 'admin' | 'arbitro'

export interface Profile {
  id: string
  user_id: string
  nome: string
  telefone: string | null
  categoria: string | null
  valor_por_jogo: number
  ativo: boolean
  criado_em: string
}

export type RegimePagamento = 'por_jogo' | 'por_etapa'

export interface Competicao {
  id: string
  nome: string
  categoria: string
  categoria_etaria: string | null
  regime: RegimePagamento
  temporada: string
  data_inicio: string
  data_fim: string
  ativo: boolean
  criado_em: string
}

export type FuncaoArbitragem = 'arbitro' | 'juiz_linha' | 'apontador' | 'delegado'

export const FUNCAO_LABEL: Record<FuncaoArbitragem, string> = {
  arbitro: 'Árbitro',
  juiz_linha: 'Juiz de Linha',
  apontador: 'Apontador',
  delegado: 'Delegado Técnico',
}

export interface ValorFuncao {
  id: string
  categoria_etaria: string
  funcao: FuncaoArbitragem
  categoria_arbitro: string
  valor: number
}

export interface ValorEtapa {
  id: string
  categoria_etaria: string
  categoria_arbitro: string
  valor: number
}

export interface Jogo {
  id: string
  competicao_id: string
  competicao?: Competicao
  data: string
  horario: string
  local: string
  mandante: string
  visitante: string
  arbitros_necessarios: number
  status: 'pendente' | 'escalado' | 'realizado' | 'cancelado'
  criado_em: string
  escalacoes?: Escalacao[]
}

export interface Disponibilidade {
  id: string
  arbitro_id: string
  jogo_id: string
  disponivel: boolean
  criado_em: string
  jogo?: Jogo
  arbitro?: Profile
}

export type EscalacaoStatus = 'pendente' | 'confirmada' | 'recusada' | 'cancelada'

export interface Escalacao {
  id: string
  jogo_id: string
  arbitro_id: string
  funcao: FuncaoArbitragem
  escalado_em: string
  notificado: boolean
  status: EscalacaoStatus
  respondido_em: string | null
  motivo_recusa: string | null
  valor: number | null
  pago: boolean
  pago_em: string | null
  jogo?: Jogo
  arbitro?: Profile
}

export interface JogoComDisponibilidade extends Jogo {
  disponibilidades: Disponibilidade[]
  total_disponiveis: number
  total_escalados: number
}
