import { createClient } from '@/lib/supabase/server'
import ConfiguracoesClient from './configuracoes-client'
import type { ValorFuncao, ValorEtapa } from '@/types'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()

  const [{ data: valoresFuncao }, { data: valoresEtapa }, { data: config }, { data: competicoes }] =
    await Promise.all([
      supabase.from('valores_funcao').select('*'),
      supabase.from('valores_etapa').select('*'),
      supabase.from('configuracoes').select('*'),
      supabase.from('competicoes').select('id, nome, temporada, regime, categoria_etaria').order('nome'),
    ])

  const configMap: Record<string, string> = Object.fromEntries(
    (config ?? []).map((c: { chave: string; valor: string }) => [c.chave, c.valor]),
  )

  // categorias etárias disponíveis (das competições + Adulto garantido)
  const catsEtarias = Array.from(
    new Set(['Adulto', ...(competicoes ?? []).map(c => c.categoria_etaria).filter(Boolean) as string[]]),
  ).sort((a, b) => (a === 'Adulto' ? -1 : b === 'Adulto' ? 1 : a.localeCompare(b)))

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange-deep">Administração</p>
        <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-primary">Configurações</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Tabelas de valores, descontos e regime de pagamento das competições</p>
      </div>

      <ConfiguracoesClient
        valoresFuncao={(valoresFuncao ?? []) as ValorFuncao[]}
        valoresEtapa={(valoresEtapa ?? []) as ValorEtapa[]}
        config={configMap}
        competicoes={(competicoes ?? []) as {
          id: string; nome: string; temporada: string; regime: 'por_jogo' | 'por_etapa'; categoria_etaria: string | null
        }[]}
        catsEtarias={catsEtarias}
      />
    </div>
  )
}
