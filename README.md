# Compras Mercado (Vite + React)

Este projeto é um **PWA (aplicativo instalável)**: funciona no Android e no iOS, pode ser instalado na tela inicial e **funciona offline** (cache do app + dados salvos localmente).

Funcionalidades implementadas conforme solicitado:

- **Total no topo** (header fixo).
- **Lista de itens virtualizada** (react-window) para não travar mesmo com muitos produtos.
- **Busca por nome com sugestões** (autocomplete) conforme você digita.
- **Campos menores** para quantidade/preço (e também nos itens da lista) para priorizar o nome do produto.
- **Legumes/Frutas/Carnes por peso**: informar **peso em gramas** e **preço por kg** e o app calcula o valor.
- **Backup automático** no navegador (localStorage) a cada alteração.
- **TXT**:
  - Botão "Baixar TXT" para exportar a compra.
  - Opção "Selecionar TXT p/ auto-salvar" para gravar diretamente em um arquivo TXT (quando o navegador suporta File System Access API, normalmente Chrome/Edge).

- **Compartilhar**:
  - Botões para **Compartilhar JSON** e **Compartilhar TXT** (WhatsApp, Email, Drive, etc.) via Web Share API.
  - Botão para **Compartilhar link do app**.

## Como rodar

1. Instale dependências:

```bash
npm install
```

2. Rode o dev server (acessível na rede local):

```bash
npm run dev
```

Abra o endereço mostrado no terminal (ex.: `http://192.168.x.x:5173/`).

## Como instalar no celular (PWA)

### Android (Chrome/Edge)

1. Abra o link do app no Chrome (ex.: `http://192.168.x.x:5173/`).
2. Menu (⋮) → **Instalar app** / **Adicionar à tela inicial**.

### iOS (Safari)

1. Abra o link do app no Safari.
2. Compartilhar → **Adicionar à Tela de Início**.

## Como compartilhar com outros aparelhos (WhatsApp/Email)

### Compartilhar seus dados (backup)

No app, na aba **Backup**:
- **Compartilhar JSON**: envio do backup completo para outro aparelho importar.
- **Compartilhar TXT**: relatório legível.

### Compartilhar o app

Se você estiver usando na rede local, o link só funciona para pessoas na **mesma rede Wi‑Fi**.

Para compartilhar com qualquer pessoa (fora da sua rede), publique o app em um host (GitHub Pages/Netlify/Vercel) e compartilhe a URL. Depois, cada pessoa instala como PWA.

## Observações importantes sobre o TXT

- Navegadores não conseguem escrever em arquivos do seu computador sem uma API específica e permissão.
- Por isso, o app **sempre** mantém backup no navegador automaticamente.
- Se você quiser gravar em um arquivo TXT de verdade, use o botão **Selecionar TXT p/ auto-salvar** (Chrome/Edge).

## Offline

- O app **abre e funciona offline** após a primeira execução (PWA cache).
- Os dados (mercados, produtos, compras e rascunho) ficam salvos localmente no dispositivo.
