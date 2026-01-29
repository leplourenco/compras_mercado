import type { Categoria } from './types';

export function normalizeNome(nome: string): string {
  return nome
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function safeId(): string {
  // crypto.randomUUID é suportado na maioria dos navegadores modernos.
  // Fallback simples para ambientes mais antigos.
  // (Não é criptograficamente forte, mas atende ao uso local.)
  const anyCrypto = globalThis.crypto as any;
  if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowHumanBR(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function categoriaLabel(cat: Categoria): string {
  switch (cat) {
    case 'outro':
      return 'Unidade';
    case 'legumes_frutas':
      return 'Legumes/Frutas (peso)';
    case 'carnes':
      return 'Carnes (peso)';
  }
}

export function formatBRL(valor: number): string {
  return (valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function parseNumberBR(v: string): number {
  // Aceita vírgula como separador decimal e ignora pontos (se vierem por engano)
  const s = String(v ?? '')
    .trim()
    .replace(/\./g, '')
    .replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

// Input helpers (PT-BR)
export function sanitizeDecimalBRInput(raw: string, opts?: { allowNegative?: boolean }): string {
  const allowNegative = opts?.allowNegative ?? false;
  const s0 = String(raw ?? '');
  // Troca ponto por vírgula para evitar erro de cálculo
  const s1 = s0.replace(/\./g, ',');
  // Remove tudo que não for dígito, vírgula ou (opcional) sinal
  const s2 = s1.replace(allowNegative ? /[^0-9,\-]/g : /[^0-9,]/g, '');
  // Mantém no máximo um '-' no começo
  let s3 = s2;
  if (allowNegative) {
    const neg = s3.startsWith('-');
    s3 = s3.replace(/\-/g, '');
    if (neg) s3 = `-${s3}`;
  } else {
    s3 = s3.replace(/\-/g, '');
  }
  // Mantém apenas a primeira vírgula
  const parts = s3.split(',');
  if (parts.length <= 1) return s3;
  return `${parts.shift() ?? ''},${parts.join('')}`;
}

export function sanitizeIntegerInput(raw: string): string {
  return String(raw ?? '').replace(/\D/g, '');
}

