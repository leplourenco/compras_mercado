import React, { useMemo, useState } from 'react';
import type { Compra, Mercado, Produto } from '../types';
import { categoriaLabel, formatBRL } from '../utils';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from 'recharts';

type Props = {
  compras: Compra[];
  mercados: Mercado[];
  produtos: Produto[];
};

type Periodo = '30' | '90' | '180' | '365' | 'tudo' | 'custom';

function addDaysISO(iso: string, deltaDays: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + deltaDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function tooltipFormatter(v: any) {
  if (typeof v === 'number') return formatBRL(v);
  return String(v);
}

export function GraficosPage(props: Props) {
  const [produtoId, setProdutoId] = useState<string>('');
  const [mercadoId, setMercadoId] = useState<string>('');
  const [periodo, setPeriodo] = useState<Periodo>('90');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  const produto = useMemo(() => props.produtos.find((p) => p.id === produtoId), [props.produtos, produtoId]);

  const range = useMemo(() => {
    if (periodo === 'custom') return { de: de || '', ate: ate || '' };
    if (periodo === 'tudo') return { de: '', ate: '' };
    const days = Number(periodo);
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayISO = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const deISO = addDaysISO(todayISO, -days);
    return { de: deISO, ate: todayISO };
  }, [periodo, de, ate]);

  const records = useMemo(() => {
    if (!produtoId) return [] as { date: string; market: string; value: number }[];

    const out: { date: string; market: string; value: number }[] = [];

    for (const c of props.compras) {
      if (mercadoId && c.mercadoId !== mercadoId) continue;
      if (range.de && c.data < range.de) continue;
      if (range.ate && c.data > range.ate) continue;

      const itens = c.itens.filter((it) => it.produtoId === produtoId);
      if (itens.length === 0) continue;

      // Para unidade: usa preço unitário; para peso: preço/kg.
      const vals: number[] = [];
      for (const it of itens) {
        if (it.categoria === 'outro') vals.push(Number(it.precoUnitario ?? 0));
        else vals.push(Number(it.precoPorKg ?? 0));
      }
      const value = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      out.push({ date: c.data, market: c.mercadoNome, value });
    }

    // Ordena por data
    out.sort((a, b) => (a.date < b.date ? -1 : 1));
    return out;
  }, [props.compras, produtoId, mercadoId, range.de, range.ate]);

  const lineData = useMemo(() => {
    if (records.length === 0) return [] as any[];
    // Pivot: {date, [market]: value}
    const byDate: Record<string, any> = {};
    for (const r of records) {
      if (!byDate[r.date]) byDate[r.date] = { date: r.date, __count: {} as Record<string, number> };
      const row = byDate[r.date];
      const k = r.market;
      // média por data+mercado se repetir
      const prev = row[k] ?? 0;
      const cnt = row.__count[k] ?? 0;
      const nextCnt = cnt + 1;
      row[k] = (prev * cnt + r.value) / nextCnt;
      row.__count[k] = nextCnt;
    }
    return Object.values(byDate)
      .map((x) => {
        const { __count, ...rest } = x;
        return rest;
      })
      .sort((a: any, b: any) => (a.date < b.date ? -1 : 1));
  }, [records]);

  const marketsInData = useMemo(() => {
    const s = new Set<string>();
    for (const r of records) s.add(r.market);
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [records]);

  const barData = useMemo(() => {
    const acc: Record<string, { sum: number; n: number }> = {};
    for (const r of records) {
      if (!acc[r.market]) acc[r.market] = { sum: 0, n: 0 };
      acc[r.market].sum += r.value;
      acc[r.market].n += 1;
    }
    return Object.entries(acc)
      .map(([market, v]) => ({ market, avg: v.n ? v.sum / v.n : 0, n: v.n }))
      .sort((a, b) => b.avg - a.avg);
  }, [records]);

  const eixoYLabel = useMemo(() => {
    if (!produto) return 'Preço';
    return produto.categoria === 'outro' ? 'Preço unitário (R$)' : 'Preço por kg (R$/kg)';
  }, [produto]);

  return (
    <div className="page">
      <div className="content">
        <section className="card" style={{ minWidth: 360 }}>
          <div className="cardTitle">Filtros</div>

          <div className="field">
            <label>Produto</label>
            <select className="select" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
              <option value="">Selecione...</option>
              {props.produtos
                .slice()
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} • {categoriaLabel(p.categoria)}{p.ativo ? '' : ' (inativo)'}
                  </option>
                ))}
            </select>
          </div>

          <div className="field" style={{ marginTop: 10 }}>
            <label>Supermercado</label>
            <select className="select" value={mercadoId} onChange={(e) => setMercadoId(e.target.value)}>
              <option value="">Todos</option>
              {props.mercados
                .slice()
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}{m.ativo ? '' : ' (inativo)'}
                  </option>
                ))}
            </select>
          </div>

          <div className="field" style={{ marginTop: 10 }}>
            <label>Período</label>
            <select
              className="select"
              value={periodo}
              onChange={(e) => {
                const v = e.target.value as Periodo;
                setPeriodo(v);
                if (v !== 'custom') {
                  setDe('');
                  setAte('');
                }
              }}
            >
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="180">Últimos 180 dias</option>
              <option value="365">Últimos 365 dias</option>
              <option value="tudo">Tudo</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {periodo === 'custom' ? (
            <div className="formRow" style={{ marginTop: 10 }}>
              <div className="field">
                <label>De</label>
                <input className="numInput" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
              </div>
              <div className="field">
                <label>Até</label>
                <input className="numInput" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="hint" style={{ marginTop: 10 }}>
              Intervalo aplicado: {range.de || '—'} até {range.ate || '—'}
            </div>
          )}

          <div className="hint" style={{ marginTop: 10 }}>
            Este gráfico usa <strong>{produto?.categoria === 'outro' ? 'preço unitário' : 'preço por kg'}</strong> para comparações.
          </div>
        </section>

        <section className="card" style={{ flex: 1, minWidth: 520 }}>
          <div className="cardTitle">Evolução no tempo</div>
          {!produtoId ? (
            <div className="empty">Selecione um produto para ver os gráficos.</div>
          ) : records.length === 0 ? (
            <div className="empty">Não há registros desse produto no período selecionado.</div>
          ) : (
            <div style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={tooltipFormatter as any} />
                  <Legend />
                  {marketsInData.map((m) => (
                    <Line key={m} type="monotone" dataKey={m} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="hint" style={{ marginTop: 10 }}>
                Eixo Y: {eixoYLabel}
              </div>
            </div>
          )}
        </section>

        <section className="card" style={{ flex: 1, minWidth: 520 }}>
          <div className="cardTitle">Média por supermercado</div>
          {!produtoId ? (
            <div className="empty">Selecione um produto.</div>
          ) : barData.length === 0 ? (
            <div className="empty">Sem dados para calcular médias.</div>
          ) : (
            <div style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="market" hide={barData.length > 8} />
                  <YAxis />
                  <Tooltip formatter={tooltipFormatter as any} />
                  <Bar dataKey="avg" />
                </BarChart>
              </ResponsiveContainer>
              <div className="hint" style={{ marginTop: 10 }}>
                Dica: se tiver muitos supermercados, passe o mouse nas barras para ver os valores.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
