import React, { useRef, useState } from 'react';
import type { AppState } from '../types';
import { downloadFile, shareFile, shareLink } from '../storage';
import { gerarTxtBackupCompleto } from '../txt';

type Props = {
  state: AppState;
  onImportState: (s: AppState) => void;
  onResetAll: () => void;
};

export function BackupPage(props: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string>('');

  async function exportJSON() {
    const nome = `backup-compras-mercado-${new Date().toISOString().slice(0, 10)}.json`;
    await downloadFile(nome, JSON.stringify(props.state, null, 2), 'application/json;charset=utf-8');
  }

  async function compartilharJSON() {
    const nome = `backup-compras-mercado-${new Date().toISOString().slice(0, 10)}.json`;
    const conteudo = JSON.stringify(props.state, null, 2);
    await shareFile({
      nomeArquivo: nome,
      conteudo,
      mime: 'application/json;charset=utf-8',
      titulo: 'App Mercado - Backup JSON',
      texto: 'Backup completo (mercados, produtos, compras e rascunho).'
    });
  }

  async function exportTXT() {
    const nome = `backup-compras-mercado-${new Date().toISOString().slice(0, 10)}.txt`;
    const txt = gerarTxtBackupCompleto(props.state);
    await downloadFile(nome, txt, 'text/plain;charset=utf-8');
  }

  async function compartilharTXT() {
    const nome = `backup-compras-mercado-${new Date().toISOString().slice(0, 10)}.txt`;
    const txt = gerarTxtBackupCompleto(props.state);
    await shareFile({
      nomeArquivo: nome,
      conteudo: txt,
      mime: 'text/plain;charset=utf-8',
      titulo: 'App Mercado - Relatório TXT',
      texto: 'Relatório legível do app (supermercados, produtos e compras).'
    });
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    setMsg('');
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      const text = await f.text();
      const parsed = JSON.parse(text) as AppState;
      if (!parsed || parsed.versao !== 2) {
        setMsg('Arquivo inválido ou versão incompatível.');
        return;
      }
      if (!confirm('Importar este backup vai SUBSTITUIR todos os dados atuais. Deseja continuar?')) return;
      props.onImportState(parsed);
      setMsg('Importação concluída.');
    } catch {
      setMsg('Não foi possível ler o arquivo. Confirme se é um JSON válido.');
    } finally {
      e.target.value = '';
    }
  }

  return (
    <div className="page">
      <div className="content">
        <section className="card" style={{ minWidth: 360 }}>
          <div className="cardTitle">Exportar / Importar</div>

          <div className="formRow">
            <button className="primary" onClick={exportJSON}>
              Exportar JSON (backup completo)
            </button>
            <button onClick={exportTXT}>Exportar TXT (relatório)</button>
          </div>

          <div className="formRow" style={{ marginTop: 10 }}>
            <button onClick={compartilharJSON}>Compartilhar JSON (WhatsApp/Email)</button>
            <button onClick={compartilharTXT}>Compartilhar TXT (WhatsApp/Email)</button>
          </div>

          <div className="formRow" style={{ marginTop: 10 }}>
            <button
              onClick={async () => {
                try {
                  await shareLink({
                    titulo: 'App Mercado',
                    texto: 'Abra este link no celular e instale pelo menu do navegador (PWA).'
                  });
                  setMsg('Link compartilhado (ou copiado).');
                } catch {
                  setMsg('Não foi possível compartilhar o link neste navegador.');
                }
              }}
            >
              Compartilhar link do app
            </button>
          </div>

          <div className="hint" style={{ marginTop: 10 }}>
            O JSON serve para restaurar tudo (mercados, produtos e compras). O TXT é um relatório legível.
          </div>

          <div style={{ marginTop: 14 }}>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={onImport} />
          </div>

          {msg ? <div className="msg">{msg}</div> : null}
        </section>

        <section className="card" style={{ minWidth: 360 }}>
          <div className="cardTitle">Zerar dados</div>
          <div className="hint">
            Use com cuidado. Recomendo exportar um backup JSON antes de zerar.
          </div>
          <div style={{ marginTop: 12 }}>
            <button
              className="danger"
              onClick={() => {
                if (!confirm('Zerar todos os dados (mercados, produtos, compras e rascunho)?')) return;
                props.onResetAll();
              }}
            >
              Zerar tudo
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
