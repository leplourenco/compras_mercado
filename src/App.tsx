import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { AppState, Categoria, ItemCompra, Mercado, Produto, TabKey } from './types';
import { fileAccessSupported, loadState, saveState, downloadFile, LS_DRAFT_TXT_KEY } from './storage';
import { normalizeNome, nowHumanBR, safeId, todayISO, formatBRL } from './utils';
import { gerarTxtRascunho, totalCompra } from './txt';
import { CompraAtualPage } from './pages/CompraAtualPage';
import { ProdutosPage } from './pages/ProdutosPage';
import { MercadosPage } from './pages/MercadosPage';
import { HistoricoPage } from './pages/HistoricoPage';
import { GraficosPage } from './pages/GraficosPage';
import { BackupPage } from './pages/BackupPage';

function tabLabel(tab: TabKey): string {
  switch (tab) {
    case 'compra':
      return 'Compra atual';
    case 'produtos':
      return 'Produtos';
    case 'mercados':
      return 'Mercados';
    case 'historico':
      return 'Histórico';
    case 'graficos':
      return 'Gráficos';
    case 'backup':
      return 'Backup';
  }
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [ultimoAutoSave, setUltimoAutoSave] = useState<string>('');
  const [mensagem, setMensagem] = useState<string>('');

  // TXT em disco (File System Access API)
  const [salvarEmTxtDisco, setSalvarEmTxtDisco] = useState(false);
  const fileHandleRef = useRef<any>(null);

  const mercadosAtivos = useMemo(() => state.mercados.filter((m) => m.ativo), [state.mercados]);
  const produtosAtivos = useMemo(() => state.produtos.filter((p) => p.ativo), [state.produtos]);

  const totalRascunho = useMemo(() => totalCompra(state.rascunho.itens), [state.rascunho.itens]);

  // Persistência local (debounce)
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        saveState(state);
        const mercado = state.mercados.find((m) => m.id === state.rascunho.mercadoId);
        const txt = gerarTxtRascunho({
          data: state.rascunho.data,
          mercadoNome: mercado?.nome,
          itens: state.rascunho.itens
        });
        localStorage.setItem(LS_DRAFT_TXT_KEY, txt);
        setUltimoAutoSave(nowHumanBR());
      } catch {
        // Ignora
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [state]);

  // Auto-salvar rascunho em TXT no disco (quando suportado e habilitado)
  useEffect(() => {
    if (!salvarEmTxtDisco) return;
    const handle = fileHandleRef.current;
    if (!handle) return;

    const mercado = state.mercados.find((m) => m.id === state.rascunho.mercadoId);
    const txt = gerarTxtRascunho({ data: state.rascunho.data, mercadoNome: mercado?.nome, itens: state.rascunho.itens });

    let cancelado = false;
    (async () => {
      try {
        const writable = await handle.createWritable();
        await writable.write(txt);
        await writable.close();
        if (!cancelado) {
          try {
            localStorage.setItem(LS_DRAFT_TXT_KEY, txt);
          } catch {
            // ignore
          }
        }
      } catch {
        if (!cancelado) {
          setMensagem(
            'Não consegui gravar no arquivo TXT. Se você negou permissão ou mudou de navegador, selecione o arquivo novamente.'
          );
          setSalvarEmTxtDisco(false);
        }
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [state.rascunho.itens, state.rascunho.data, state.rascunho.mercadoId, salvarEmTxtDisco, state.mercados]);

  function setTab(tab: TabKey) {
    setState((prev) => ({ ...prev, ui: { ...prev.ui, tab } }));
    setMensagem('');
  }

  // CRUD Produtos
  function addProduto(nome: string, categoria: Categoria) {
    const key = normalizeNome(nome);
    if (!key) return;

    setState((prev) => {
      const existing = prev.produtos.find((p) => p.nomeKey === key);
      if (existing) {
        const produtos = prev.produtos.map((p) =>
          p.id === existing.id
            ? { ...p, nome: nome.trim().replace(/\s+/g, ' '), nomeKey: key, categoria, ativo: true, atualizadoEm: Date.now() }
            : p
        );
        return { ...prev, produtos };
      }
      const novo: Produto = {
        id: safeId(),
        nome: nome.trim().replace(/\s+/g, ' '),
        nomeKey: key,
        categoria,
        ativo: true,
        criadoEm: Date.now(),
        atualizadoEm: Date.now()
      };
      return { ...prev, produtos: [novo, ...prev.produtos] };
    });
  }

  function updateProduto(id: string, patch: Partial<Produto>) {
    setState((prev) => ({ ...prev, produtos: prev.produtos.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }

  function toggleProdutoAtivo(id: string) {
    setState((prev) => ({
      ...prev,
      produtos: prev.produtos.map((p) => (p.id === id ? { ...p, ativo: !p.ativo, atualizadoEm: Date.now() } : p))
    }));
  }

  // CRUD Mercados
  function addMercado(nome: string) {
    const key = normalizeNome(nome);
    if (!key) return;

    setState((prev) => {
      const existing = prev.mercados.find((m) => m.nomeKey === key);
      if (existing) {
        const mercados = prev.mercados.map((m) =>
          m.id === existing.id
            ? { ...m, nome: nome.trim().replace(/\s+/g, ' '), nomeKey: key, ativo: true, atualizadoEm: Date.now() }
            : m
        );
        return { ...prev, mercados };
      }
      const novo: Mercado = {
        id: safeId(),
        nome: nome.trim().replace(/\s+/g, ' '),
        nomeKey: key,
        ativo: true,
        criadoEm: Date.now(),
        atualizadoEm: Date.now()
      };
      return { ...prev, mercados: [novo, ...prev.mercados] };
    });
  }

  function updateMercado(id: string, patch: Partial<Mercado>) {
    setState((prev) => ({ ...prev, mercados: prev.mercados.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  }

  function toggleMercadoAtivo(id: string) {
    setState((prev) => ({
      ...prev,
      mercados: prev.mercados.map((m) => (m.id === id ? { ...m, ativo: !m.ativo, atualizadoEm: Date.now() } : m))
    }));
  }

  // Rascunho
  function setRascunhoMercadoId(id: string) {
    setState((prev) => ({ ...prev, rascunho: { ...prev.rascunho, mercadoId: id } }));
  }

  function setRascunhoData(dataISO: string) {
    setState((prev) => ({ ...prev, rascunho: { ...prev.rascunho, data: dataISO } }));
  }

  function addItemRascunho(item: ItemCompra) {
    setState((prev) => ({ ...prev, rascunho: { ...prev.rascunho, itens: [item, ...prev.rascunho.itens] } }));
  }

  function updateItemRascunho(id: string, patch: Partial<ItemCompra>) {
    setState((prev) => ({
      ...prev,
      rascunho: { ...prev.rascunho, itens: prev.rascunho.itens.map((it) => (it.id === id ? { ...it, ...patch } : it)) }
    }));
  }

  function removeItemRascunho(id: string) {
    setState((prev) => ({ ...prev, rascunho: { ...prev.rascunho, itens: prev.rascunho.itens.filter((it) => it.id !== id) } }));
  }

  function novaCompra() {
    if (!confirm('Deseja limpar a compra atual (rascunho)?')) return;
    setState((prev) => ({ ...prev, rascunho: { ...prev.rascunho, data: todayISO(), itens: [] } }));
    setMensagem('');
  }

  function finalizarCompra() {
    setMensagem('');
    if (!state.rascunho.mercadoId) {
      setMensagem('Selecione um supermercado antes de finalizar.');
      return;
    }
    if (state.rascunho.itens.length === 0) {
      setMensagem('Adicione itens antes de finalizar.');
      return;
    }

    const mercado = state.mercados.find((m) => m.id === state.rascunho.mercadoId);
    const mercadoNome = mercado?.nome ?? '(Supermercado não encontrado)';

    if (!confirm(`Finalizar compra em ${mercadoNome} com total ${formatBRL(totalRascunho)}?`)) return;

    setState((prev) => {
      const compra = {
        id: safeId(),
        mercadoId: prev.rascunho.mercadoId,
        mercadoNome,
        data: prev.rascunho.data,
        criadoEm: Date.now(),
        itens: prev.rascunho.itens
      };
      return {
        ...prev,
        compras: [compra, ...prev.compras],
        rascunho: { ...prev.rascunho, data: todayISO(), itens: [] }
      };
    });

    setMensagem('Compra finalizada e registrada no histórico.');
  }

  function deleteCompra(id: string) {
    setState((prev) => ({ ...prev, compras: prev.compras.filter((c) => c.id !== id) }));
  }

  async function baixarTxtRascunho() {
    const mercado = state.mercados.find((m) => m.id === state.rascunho.mercadoId);
    const txt = gerarTxtRascunho({ data: state.rascunho.data, mercadoNome: mercado?.nome, itens: state.rascunho.itens });
    await downloadFile(`compra-${new Date().toISOString().slice(0, 10)}.txt`, txt);
  }

  async function selecionarArquivoTxt() {
    setMensagem('');

    const anyWin = window as any;
    if (!fileAccessSupported()) {
      setMensagem(
        'Seu navegador não suporta salvar diretamente em um arquivo TXT. O app já faz backup automático no navegador e você pode baixar o TXT a qualquer momento.'
      );
      setSalvarEmTxtDisco(false);
      return;
    }

    try {
      const handle = await anyWin.showSaveFilePicker({
        suggestedName: `compra-${new Date().toISOString().slice(0, 10)}.txt`,
        types: [
          {
            description: 'Arquivo TXT',
            accept: { 'text/plain': ['.txt'] }
          }
        ]
      });
      fileHandleRef.current = handle;
      setSalvarEmTxtDisco(true);

      // grava imediatamente
      const mercado = state.mercados.find((m) => m.id === state.rascunho.mercadoId);
      const txt = gerarTxtRascunho({ data: state.rascunho.data, mercadoNome: mercado?.nome, itens: state.rascunho.itens });
      const writable = await handle.createWritable();
      await writable.write(txt);
      await writable.close();
    } catch {
      setSalvarEmTxtDisco(false);
    }
  }

  function importState(s: AppState) {
    setState(s);
    setMensagem('Dados importados.');
  }

  function resetAll() {
    localStorage.clear();
    setState(loadState());
    setMensagem('Dados zerados.');
    setSalvarEmTxtDisco(false);
    fileHandleRef.current = null;
  }

  const tabs: TabKey[] = ['compra', 'produtos', 'mercados', 'historico', 'graficos', 'backup'];

  return (
    <div className="app">
      <header className="header">
        <div className="headerMain">
          <div>
            <div className="title">Compras Mercado</div>
            <div className="subtitle">
              Aba: <strong>{tabLabel(state.ui.tab)}</strong>
              <span className="sep">•</span>
              Total (compra atual): <strong className="total">{formatBRL(totalRascunho)}</strong>
              <span className="sep">•</span>
              Itens: <strong>{state.rascunho.itens.length}</strong>
              <span className="sep">•</span>
              Backup local: <strong>{ultimoAutoSave || '—'}</strong>
            </div>
          </div>

          <div className="headerActions">
            <button onClick={novaCompra}>Nova compra</button>
            <button onClick={baixarTxtRascunho}>Baixar TXT</button>
            <button onClick={selecionarArquivoTxt}>
              {salvarEmTxtDisco ? 'TXT no disco: ativo' : 'Selecionar TXT p/ auto-salvar'}
            </button>
          </div>
        </div>

        <div className="tabs">
          {tabs.map((t) => (
            <button key={t} className={state.ui.tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
              {tabLabel(t)}
            </button>
          ))}
        </div>

        {mensagem ? <div className="msg">{mensagem}</div> : null}
      </header>

      <main className="main">
        {state.ui.tab === 'compra' ? (
          <CompraAtualPage
            state={state}
            mercadosAtivos={mercadosAtivos}
            produtosAtivos={produtosAtivos}
            onSetMercadoId={setRascunhoMercadoId}
            onSetData={setRascunhoData}
            onAddItem={addItemRascunho}
            onUpdateItem={updateItemRascunho}
            onRemoveItem={removeItemRascunho}
            onFinalizar={finalizarCompra}
            onGoProdutos={() => setTab('produtos')}
          />
        ) : null}

        {state.ui.tab === 'produtos' ? (
          <ProdutosPage produtos={state.produtos} onAdd={addProduto} onUpdate={updateProduto} onToggleAtivo={toggleProdutoAtivo} />
        ) : null}

        {state.ui.tab === 'mercados' ? (
          <MercadosPage mercados={state.mercados} onAdd={addMercado} onUpdate={updateMercado} onToggleAtivo={toggleMercadoAtivo} />
        ) : null}

        {state.ui.tab === 'historico' ? (
          <HistoricoPage compras={state.compras} mercados={state.mercados} onDeleteCompra={deleteCompra} />
        ) : null}

        {state.ui.tab === 'graficos' ? (
          <GraficosPage compras={state.compras} mercados={state.mercados} produtos={state.produtos} />
        ) : null}

        {state.ui.tab === 'backup' ? (
          <BackupPage state={state} onImportState={importState} onResetAll={resetAll} />
        ) : null}
      </main>

      <footer className="footer">
        <div>
          Total (compra atual): <strong>{formatBRL(totalRascunho)}</strong>
        </div>
        <div className="footerActions">
          <button
            onClick={() => {
              try {
                const txt = localStorage.getItem(LS_DRAFT_TXT_KEY);
                if (txt) downloadFile(`compra-backup-${new Date().toISOString().slice(0, 10)}.txt`, txt);
                else baixarTxtRascunho();
              } catch {
                baixarTxtRascunho();
              }
            }}
          >
            Baixar backup
          </button>
        </div>
      </footer>
    </div>
  );
}
