'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, DollarSign, Printer } from 'lucide-react'

interface Competicao { id: string; nome: string; temporada: string }
interface LinhaRelatorio {
  arbitroId: string
  nome: string
  categoria: string
  jogos: number
  valorPorJogo: number
  total: number
}

export default function RelatoriosClient({ competicoes }: { competicoes: Competicao[] }) {
  const [competicaoId, setCompeticaoId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [loading, setLoading] = useState(false)
  const [linhas, setLinhas] = useState<LinhaRelatorio[]>([])
  const [buscado, setBuscado] = useState(false)

  const competicaoNome = competicoes.find(c => c.id === competicaoId)?.nome ?? ''

  async function buscar() {
    if (!competicaoId) return
    setLoading(true)
    setBuscado(true)

    const supabase = createClient()
    let query = supabase
      .from('escalacoes')
      .select('arbitro_id, arbitro:profiles(nome, categoria, valor_por_jogo), jogo:jogos(competicao_id, data)')
      .eq('jogo.competicao_id', competicaoId)

    if (dataInicio) query = query.gte('jogo.data', dataInicio)
    if (dataFim) query = query.lte('jogo.data', dataFim)

    const { data, error } = await query
    setLoading(false)

    if (error || !data) return

    // Agrupa por árbitro
    const mapa = new Map<string, LinhaRelatorio>()
    type EscArbitro = { nome: string; categoria: string | null; valor_por_jogo: number }
    type EscRow = { arbitro_id: string; arbitro: EscArbitro | EscArbitro[] | null; jogo: { competicao_id: string; data: string } | { competicao_id: string; data: string }[] | null }
    ;(data as EscRow[]).forEach((esc) => {
      if (!esc.jogo) return // filtro de competição
      const aRaw = esc.arbitro
      if (!aRaw) return
      // Supabase pode retornar objeto ou array dependendo da relação
      const a: EscArbitro = Array.isArray(aRaw) ? aRaw[0] : aRaw
      if (!a) return
      const id = esc.arbitro_id
      if (!mapa.has(id)) {
        mapa.set(id, {
          arbitroId: id,
          nome: a.nome,
          categoria: a.categoria ?? '',
          jogos: 0,
          valorPorJogo: a.valor_por_jogo,
          total: 0,
        })
      }
      const linha = mapa.get(id)!
      linha.jogos++
      linha.total = linha.jogos * linha.valorPorJogo
    })

    setLinhas(Array.from(mapa.values()).sort((a, b) => b.total - a.total))
  }

  const totalGeral = linhas.reduce((sum, l) => sum + l.total, 0)

  return (
    <div className="space-y-6">
      {/* Cabeçalho visível apenas na impressão */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">Liga Catarinense de Voleibol</h1>
        <h2 className="text-lg font-semibold">Relatório Financeiro — {competicaoNome}</h2>
        {(dataInicio || dataFim) && (
          <p className="text-sm text-gray-600">
            Período: {dataInicio ? new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'início'} até {dataFim ? new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : 'hoje'}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      {/* Filtros */}
      <Card className="print:hidden">
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Competição *</Label>
              <Select value={competicaoId} onValueChange={setCompeticaoId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {competicoes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome} — {c.temporada}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={buscar} disabled={loading || !competicaoId}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? 'Buscando...' : 'Gerar Relatório'}
            </Button>
            {linhas.length > 0 && (
              <Button variant="outline" onClick={() => window.print()} className="print:hidden">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir / PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {buscado && (
        <>
          {linhas.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              Nenhuma escalação encontrada para este filtro.
            </p>
          ) : (
            <>
              {/* Resumo */}
              <div className="grid gap-4 md:grid-cols-3 print:hidden">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total de Árbitros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{linhas.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total de Jogos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{linhas.reduce((s, l) => s + l.jogos, 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" /> Total a Pagar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-400">
                      R$ {totalGeral.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela */}
              <Card>
                <CardContent className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Árbitro</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-center">Jogos</TableHead>
                        <TableHead className="text-right">Valor/Jogo</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linhas.map((l) => (
                        <TableRow key={l.arbitroId}>
                          <TableCell className="font-medium">{l.nome}</TableCell>
                          <TableCell>
                            {l.categoria && <Badge variant="secondary">{l.categoria}</Badge>}
                          </TableCell>
                          <TableCell className="text-center">{l.jogos}</TableCell>
                          <TableCell className="text-right">R$ {l.valorPorJogo.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold text-green-400">
                            R$ {l.total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 bg-accent/30">
                        <TableCell colSpan={4} className="font-bold">TOTAL GERAL</TableCell>
                        <TableCell className="text-right font-bold text-green-400 text-lg">
                          R$ {totalGeral.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
