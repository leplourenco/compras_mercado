import type { AppState, Compra, ItemCompra } from './types';
import { categoriaLabel, formatBRL, nowHumanBR } from './utils';

export function calcularTotalItem(it: ItemCompra): number {
  if (it.categoria === 'outro') {
    const q = Number(it.quantidade ?? 0);
    const p = Number(it.precoUnitario ?? 0);
    return q * p;
  }
  const g = Number(it.pesoGramas ?? 0);
  const pk = Number(it.precoPorKg ?? 0);
  return (g / 1000) * pk;
}

export function totalCompra(itens: ItemCompra[]): number {
  return itens.reduce((acc, it) => acc + calcularTotalItem(it), 0);
}

export function gerarTxtRascunho(opts: {
  mercadoNome?: string;
  data?: string;
  itens: ItemCompra[];
}): string {
  const total = totalCompra(opts.itens);
  const linhas: string[] = [];
  linhas.push(`Compras Mercado - Rascunho (${nowHumanBR()})`);
  if (opts.mercadoNome) linhas.push(`Supermercado: ${opts.mercadoNome}`);
  if (opts.data) linhas.push(`Data: ${opts.data}`);
  linhas.push('');

  if (opts.itens.length === 0) {
    linhas.push('(Sem itens)');
  } else {
    linhas.push('Itens:');
    for (const it of opts.itens) {
      const t = calcularTotalItem(it);
      if (it.categoria === 'outro') {
        const q = Number(it.quantidade ?? 0);
        const p = Number(it.precoUnitario ?? 0);
        linhas.push(`- ${it.produtoNome} | ${categoriaLabel(it.categoria)} | ${q} x ${formatBRL(p)} = ${formatBRL(t)}`);
      } else {
        const g = Number(it.pesoGramas ?? 0);
        const pk = Number(it.precoPorKg ?? 0);
        linhas.push(
          `- ${it.produtoNome} | ${categoriaLabel(it.categoria)} | ${g} g x ${formatBRL(pk)}/kg = ${formatBRL(t)}`
        );
      }
    }
  }

  linhas.push('');
  linhas.push(`TOTAL: ${formatBRL(total)}`);
  linhas.push('');
  linhas.push('Observação: o app mantém um backup local (navegador) automaticamente.');
  return linhas.join('\n');
}

export function gerarTxtCompras(compras: Compra[]): string {
  const linhas: string[] = [];
  linhas.push(`Compras Mercado - Histórico (${nowHumanBR()})`);
  linhas.push('');

  if (compras.length === 0) {
    linhas.push('(Sem compras registradas)');
    return linhas.join('\n');
  }

  const ordenadas = compras.slice().sort((a, b) => (a.data < b.data ? 1 : -1));
  for (const c of ordenadas) {
    linhas.push(`Compra: ${c.data} | ${c.mercadoNome} | Total: ${formatBRL(totalCompra(c.itens))}`);
    for (const it of c.itens) {
      const t = calcularTotalItem(it);
      if (it.categoria === 'outro') {
        const q = Number(it.quantidade ?? 0);
        const p = Number(it.precoUnitario ?? 0);
        linhas.push(`  - ${it.produtoNome} | ${q} x ${formatBRL(p)} = ${formatBRL(t)}`);
      } else {
        const g = Number(it.pesoGramas ?? 0);
        const pk = Number(it.precoPorKg ?? 0);
        linhas.push(`  - ${it.produtoNome} | ${g} g x ${formatBRL(pk)}/kg = ${formatBRL(t)}`);
      }
    }
    linhas.push('');
  }

  return linhas.join('\n');
}

export function gerarTxtBackupCompleto(state: AppState): string {
  const linhas: string[] = [];
  linhas.push(`Compras Mercado - Export TXT (${nowHumanBR()})`);
  linhas.push('');

  linhas.push('== Supermercados ==');
  if (state.mercados.length === 0) linhas.push('(Nenhum)');
  for (const m of state.mercados.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))) {
    linhas.push(`- ${m.nome}${m.ativo ? '' : ' (inativo)'}`);
  }

  linhas.push('');
  linhas.push('== Produtos ==');
  if (state.produtos.length === 0) linhas.push('(Nenhum)');
  for (const p of state.produtos.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))) {
    linhas.push(`- ${p.nome} | ${categoriaLabel(p.categoria)}${p.ativo ? '' : ' (inativo)'}`);
  }

  linhas.push('');
  linhas.push('== Compras ==');
  linhas.push(gerarTxtCompras(state.compras));

  linhas.push('');
  linhas.push('== Rascunho (compra em andamento) ==');
  const mercado = state.mercados.find((m) => m.id === state.rascunho.mercadoId);
  linhas.push(
    gerarTxtRascunho({
      data: state.rascunho.data,
      mercadoNome: mercado?.nome,
      itens: state.rascunho.itens
    })
  );

  return linhas.join('\n');
}
