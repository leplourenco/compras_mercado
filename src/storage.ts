import type { AppState, TabKey } from './types';
import { todayISO } from './utils';

export const LS_STATE_KEY = 'cmw_state_v2';
export const LS_DRAFT_TXT_KEY = 'cmw_draft_txt_v2';

export function initialState(): AppState {
  return {
    versao: 2,
    produtos: [],
    mercados: [],
    compras: [],
    rascunho: {
      mercadoId: '',
      data: todayISO(),
      itens: []
    },
    ui: {
      tab: 'compra'
    }
  };
}

function isTabKey(v: any): v is TabKey {
  return v === 'compra' || v === 'produtos' || v === 'mercados' || v === 'historico' || v === 'graficos' || v === 'backup';
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(LS_STATE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as AppState;
    if (parsed?.versao !== 2) return initialState();

    // Harden básico para evitar estado corrompido
    const s: AppState = {
      versao: 2,
      produtos: Array.isArray(parsed.produtos) ? parsed.produtos : [],
      mercados: Array.isArray(parsed.mercados) ? parsed.mercados : [],
      compras: Array.isArray(parsed.compras) ? parsed.compras : [],
      rascunho: {
        mercadoId: parsed.rascunho?.mercadoId ?? '',
        data: parsed.rascunho?.data ?? todayISO(),
        itens: Array.isArray(parsed.rascunho?.itens) ? parsed.rascunho.itens : []
      },
      ui: {
        tab: isTabKey(parsed.ui?.tab) ? parsed.ui.tab : 'compra'
      }
    };

    return s;
  } catch {
    return initialState();
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(LS_STATE_KEY, JSON.stringify(state));
}

export async function downloadFile(nomeArquivo: string, conteudo: string, mime = 'text/plain;charset=utf-8'): Promise<void> {
  const blob = new Blob([conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Compartilha um arquivo via WhatsApp / Email / etc (Web Share API).
 * Fallback: download do arquivo.
 */
export async function shareFile(opts: {
  nomeArquivo: string;
  conteudo: string;
  mime?: string;
  titulo?: string;
  texto?: string;
}): Promise<void> {
  const mime = opts.mime ?? 'text/plain;charset=utf-8';
  const nav: any = navigator;

  // Web Share (com arquivos) é mais comum no Android (Chrome/Edge) e funciona bem para WhatsApp.
  const canShareFiles =
    typeof nav?.share === 'function' &&
    typeof window.File === 'function' &&
    typeof nav?.canShare === 'function';

  const blob = new Blob([opts.conteudo], { type: mime });
  const file = typeof window.File === 'function' ? new File([blob], opts.nomeArquivo, { type: mime }) : null;

  if (canShareFiles && file && nav.canShare({ files: [file] })) {
    await nav.share({
      title: opts.titulo ?? 'App Mercado',
      text: opts.texto,
      files: [file]
    });
    return;
  }

  // Fallback 1: compartilhar link/texto (sem arquivo)
  if (typeof nav?.share === 'function') {
    try {
      await nav.share({
        title: opts.titulo ?? 'App Mercado',
        text: [opts.texto, `Arquivo: ${opts.nomeArquivo}`].filter(Boolean).join('\n')
      });
      return;
    } catch {
      // continua para fallback download
    }
  }

  // Fallback 2: download
  await downloadFile(opts.nomeArquivo, opts.conteudo, mime);
}

export async function shareLink(opts: { titulo?: string; texto?: string; url?: string }): Promise<void> {
  const nav: any = navigator;
  const url = opts.url ?? window.location.href;
  if (typeof nav?.share === 'function') {
    await nav.share({ title: opts.titulo ?? 'App Mercado', text: opts.texto, url });
    return;
  }
  // fallback: copia para área de transferência
  await navigator.clipboard?.writeText?.(url);
}

export function fileAccessSupported(): boolean {
  return typeof (window as any).showSaveFilePicker === 'function';
}
