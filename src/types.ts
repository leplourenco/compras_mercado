export type Categoria = 'outro' | 'legumes_frutas' | 'carnes';

export type Produto = {
  id: string;
  nome: string;
  nomeKey: string;
  categoria: Categoria;
  ativo: boolean;
  criadoEm: number;
  atualizadoEm: number;
};

export type Mercado = {
  id: string;
  nome: string;
  nomeKey: string;
  ativo: boolean;
  criadoEm: number;
  atualizadoEm: number;
};

export type ItemCompra = {
  id: string;
  produtoId: string;
  produtoNome: string; // snapshot
  categoria: Categoria; // snapshot
  quantidade?: number; // unidades
  precoUnitario?: number; // R$
  pesoGramas?: number; // g
  precoPorKg?: number; // R$/kg
  criadoEm: number;
};

export type Compra = {
  id: string;
  mercadoId: string;
  mercadoNome: string; // snapshot
  data: string; // YYYY-MM-DD
  criadoEm: number;
  itens: ItemCompra[];
};

export type RascunhoCompra = {
  mercadoId: string | '';
  data: string; // YYYY-MM-DD
  itens: ItemCompra[];
};

export type TabKey = 'compra' | 'produtos' | 'mercados' | 'historico' | 'graficos' | 'backup';

export type AppState = {
  versao: 2;
  produtos: Produto[];
  mercados: Mercado[];
  compras: Compra[];
  rascunho: RascunhoCompra;
  ui: {
    tab: TabKey;
  };
};
