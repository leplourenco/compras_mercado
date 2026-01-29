import React, { useEffect, useMemo, useRef, useState } from 'react';
import { sanitizeDecimalBRInput } from '../utils';

type Props = {
  title?: string;
  onClose: () => void;
  onPrice: (priceBR: string) => void;
};

type Crop = { x: number; y: number; w: number; h: number };

function normalizePriceBR(raw: string): string {
  let s = String(raw ?? '').trim();
  if (!s) return '';
  // Remove espaços
  s = s.replace(/\s+/g, '');

  // Se tem "." e "," assume "." milhar e "," decimal. Ex: 1.234,56
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '');
  } else if (s.includes('.') && !s.includes(',')) {
    // Ex: 12.34 -> 12,34
    s = s.replace('.', ',');
  }
  return sanitizeDecimalBRInput(s);
}

function extractPriceCandidatesBR(text: string): string[] {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();

  // Captura: 12,34 | 12.34 | 1.234,56 | 1,234.56 (normaliza depois)
  const priceRegex = /(\d{1,3}(?:[\.,]\d{3})*[\.,]\d{2})/g;
  const matches = t.match(priceRegex) ?? [];
  const norm = matches
    .map((m) => normalizePriceBR(m))
    .filter((x) => !!x);

  // Dedup preservando ordem
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of norm) {
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function preprocessToHighContrastBW(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d');
  if (!ctx) return src;

  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  const d = img.data;

  // Grayscale + contraste + threshold simples
  // (O objetivo aqui é favorecer dígitos e separadores)
  const contrast = 1.35; // 1.0 = sem ajuste
  const threshold = 160; // 0..255
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    // luminância
    let y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // contraste
    y = (y - 128) * contrast + 128;
    const v = y >= threshold ? 255 : 0;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

export function PriceScanner({ title, onClose, onPrice }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');
  const [debugText, setDebugText] = useState<string>('');

  const [mode, setMode] = useState<'live' | 'crop' | 'pick'>('live');
  const [imgUrl, setImgUrl] = useState<string>('');
  const [imgSize, setImgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, w: 0, h: 0 });
  const [candidates, setCandidates] = useState<string[]>([]);

  const cropBoxRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    action: 'move' | 'nw' | 'ne' | 'sw' | 'se' | null;
    startX: number;
    startY: number;
    startCrop: Crop;
  }>({ action: null, startX: 0, startY: 0, startCrop: { x: 0, y: 0, w: 0, h: 0 } });

  const canUseCamera = useMemo(() => {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }, []);

  useEffect(() => {
    let isMounted = true;
    let localStream: MediaStream | null = null;

    async function start() {
      setError('');
      if (!canUseCamera) {
        setError('Câmera não suportada neste navegador.');
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        if (!isMounted) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        localStream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
      } catch (e: any) {
        setError(e?.message ? `Não foi possível acessar a câmera: ${e.message}` : 'Não foi possível acessar a câmera.');
      }
    }

    start();
    return () => {
      isMounted = false;
      if (localStream) localStream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stop() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
  }

  function closeAll() {
    stop();
    onClose();
  }

  function setDefaultCrop(w: number, h: number) {
    // Padrão: faixa inferior central (onde normalmente está o preço em etiqueta/nota)
    const cw = Math.floor(w * 0.75);
    const ch = Math.floor(h * 0.28);
    const cx = Math.floor((w - cw) / 2);
    const cy = Math.floor(h * 0.60);
    setCrop({ x: cx, y: cy, w: cw, h: ch });
  }

  function updatePreview() {
    const canvas = previewCanvasRef.current;
    if (!canvas || !imgUrl || !imgSize.w || !imgSize.h) return;

    const img = new Image();
    img.onload = () => {
      const scale = 1; // preview em pixels reais do crop (para o OCR)
      canvas.width = Math.max(1, Math.floor(crop.w * scale));
      canvas.height = Math.max(1, Math.floor(crop.h * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.w,
        crop.h,
        0,
        0,
        canvas.width,
        canvas.height
      );
    };
    img.src = imgUrl;
  }

  useEffect(() => {
    if (mode === 'crop') updatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, crop.x, crop.y, crop.w, crop.h, imgUrl]);

  async function captureFrame() {
    setError('');
    setDebugText('');
    setCandidates([]);

    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) {
      setError('Câmera não inicializada.');
      return;
    }
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Falha ao capturar imagem.');
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);

    // Salva como JPEG para reduzir peso
    const url = canvas.toDataURL('image/jpeg', 0.92);
    setImgUrl(url);
    setImgSize({ w, h });
    setDefaultCrop(w, h);
    setMode('crop');
  }

  function getDisplayedScale(containerW: number, containerH: number) {
    // Mantém aspect ratio do vídeo/imagem dentro da área disponível
    const iw = imgSize.w || 1;
    const ih = imgSize.h || 1;
    const s = Math.min(containerW / iw, containerH / ih);
    return s;
  }

  function startDrag(action: 'move' | 'nw' | 'ne' | 'sw' | 'se', e: React.PointerEvent) {
    if (busy) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = {
      action,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop }
    };
  }

  function onDrag(e: React.PointerEvent) {
    const st = dragStateRef.current;
    if (!st.action) return;

    const box = cropBoxRef.current;
    if (!box) return;

    const container = box.parentElement as HTMLElement | null;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scale = getDisplayedScale(rect.width, rect.height);

    const dx = (e.clientX - st.startX) / scale;
    const dy = (e.clientY - st.startY) / scale;

    const minSize = 40;

    let nx = st.startCrop.x;
    let ny = st.startCrop.y;
    let nw = st.startCrop.w;
    let nh = st.startCrop.h;

    switch (st.action) {
      case 'move':
        nx = st.startCrop.x + dx;
        ny = st.startCrop.y + dy;
        break;
      case 'nw':
        nx = st.startCrop.x + dx;
        ny = st.startCrop.y + dy;
        nw = st.startCrop.w - dx;
        nh = st.startCrop.h - dy;
        break;
      case 'ne':
        ny = st.startCrop.y + dy;
        nw = st.startCrop.w + dx;
        nh = st.startCrop.h - dy;
        break;
      case 'sw':
        nx = st.startCrop.x + dx;
        nw = st.startCrop.w - dx;
        nh = st.startCrop.h + dy;
        break;
      case 'se':
        nw = st.startCrop.w + dx;
        nh = st.startCrop.h + dy;
        break;
    }

    // Clamp e garante tamanho mínimo
    nw = Math.max(minSize, nw);
    nh = Math.max(minSize, nh);
    nx = clamp(nx, 0, imgSize.w - nw);
    ny = clamp(ny, 0, imgSize.h - nh);

    setCrop({ x: nx, y: ny, w: nw, h: nh });
  }

  function endDrag(e: React.PointerEvent) {
    const st = dragStateRef.current;
    if (!st.action) return;
    dragStateRef.current.action = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  async function readCroppedArea() {
    setError('');
    setDebugText('');
    setCandidates([]);

    if (!imgUrl) {
      setError('Nenhuma imagem capturada.');
      return;
    }
    setBusy(true);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Falha ao carregar imagem.'));
        img.src = imgUrl;
      });

      // 1) Recorta em canvas
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = Math.max(1, Math.floor(crop.w));
      cropCanvas.height = Math.max(1, Math.floor(crop.h));
      const cctx = cropCanvas.getContext('2d');
      if (!cctx) throw new Error('Falha ao preparar imagem.');
      cctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, cropCanvas.width, cropCanvas.height);

      // 2) Preprocess (B/W alto contraste)
      const bw = preprocessToHighContrastBW(cropCanvas);

      // 3) OCR (lazy-load)
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker({ logger: () => {} });

      // Mantemos ENG + whitelist numérica para reduzir erros.
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789.,R$',
        preserve_interword_spaces: '1'
      } as any);

      const { data } = await worker.recognize(bw);
      await worker.terminate();

      const txt = data?.text ?? '';
      setDebugText(txt);

      const prices = extractPriceCandidatesBR(txt);
      if (!prices.length) {
        setError('Não consegui identificar um preço na área selecionada. Ajuste o recorte e tente novamente.');
        return;
      }

      if (prices.length === 1) {
        onPrice(prices[0]);
        stop();
        return;
      }

      // Se houver múltiplos, deixa escolher
      setCandidates(prices);
      setMode('pick');
    } catch (e: any) {
      setError(e?.message ? `Erro ao reconhecer texto: ${e.message}` : 'Erro ao reconhecer texto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="modal" style={{ maxWidth: 920 }}>
        <div className="modalHeader">
          <div className="modalTitle">{title ?? 'Ler preço pela câmera'}</div>
          <button type="button" onClick={closeAll} className="btn btnSecondary">Fechar</button>
        </div>

        {error ? <div className="alert alertError">{error}</div> : null}

        {mode === 'live' ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000' }}>
              <video ref={videoRef} style={{ width: '100%', height: 'auto' }} playsInline />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btnPrimary" disabled={busy} onClick={captureFrame}>
                {busy ? 'Processando...' : 'Capturar'}
              </button>
            </div>

            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Dica: aproxime do valor, evite reflexo e mantenha a câmera bem estável.
            </div>
          </div>
        ) : null}

        {mode === 'crop' ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 12 }}>
              <div
                style={{
                  position: 'relative',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#111',
                  height: 460
                }}
              >
                {/* imagem */}
                <img
                  src={imgUrl}
                  alt="captura"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />

                {/* overlay de crop */}
                <div
                  ref={cropBoxRef}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: busy ? 'none' : 'auto'
                  }}
                  onPointerMove={onDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  {(() => {
                    // calcula caixa em coordenadas da imagem exibida
                    const container = cropBoxRef.current?.getBoundingClientRect();
                    const cw = container?.width ?? 1;
                    const ch = container?.height ?? 1;
                    const scale = getDisplayedScale(cw, ch);
                    const dispW = imgSize.w * scale;
                    const dispH = imgSize.h * scale;
                    const offX = (cw - dispW) / 2;
                    const offY = (ch - dispH) / 2;

                    const left = offX + crop.x * scale;
                    const top = offY + crop.y * scale;
                    const width = crop.w * scale;
                    const height = crop.h * scale;

                    const handleStyle: React.CSSProperties = {
                      position: 'absolute',
                      width: 14,
                      height: 14,
                      borderRadius: 8,
                      background: '#fff',
                      border: '2px solid #111',
                      boxShadow: '0 1px 2px rgba(0,0,0,.6)'
                    };

                    return (
                      <div
                        style={{
                          position: 'absolute',
                          left,
                          top,
                          width,
                          height,
                          border: '2px solid rgba(255,255,255,0.9)',
                          boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                          borderRadius: 10,
                          touchAction: 'none'
                        }}
                        onPointerDown={(e) => startDrag('move', e)}
                      >
                        <div
                          style={{ ...handleStyle, left: -7, top: -7, cursor: 'nwse-resize' }}
                          onPointerDown={(e) => startDrag('nw', e)}
                        />
                        <div
                          style={{ ...handleStyle, right: -7, top: -7, cursor: 'nesw-resize' }}
                          onPointerDown={(e) => startDrag('ne', e)}
                        />
                        <div
                          style={{ ...handleStyle, left: -7, bottom: -7, cursor: 'nesw-resize' }}
                          onPointerDown={(e) => startDrag('sw', e)}
                        />
                        <div
                          style={{ ...handleStyle, right: -7, bottom: -7, cursor: 'nwse-resize' }}
                          onPointerDown={(e) => startDrag('se', e)}
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
                <div style={{ fontWeight: 600 }}>Pré-visualização do recorte</div>
                <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.12)' }}>
                  <canvas ref={previewCanvasRef} style={{ width: '100%', display: 'block' }} />
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <button type="button" className="btn btnPrimary" disabled={busy} onClick={readCroppedArea}>
                    {busy ? 'Lendo...' : 'Ler área selecionada'}
                  </button>
                  <button type="button" className="btn btnSecondary" disabled={busy} onClick={() => setMode('live')}>
                    Capturar novamente
                  </button>
                </div>

                <details style={{ marginTop: 6 }}>
                  <summary style={{ cursor: 'pointer' }}>Mostrar texto reconhecido (debug)</summary>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, marginTop: 8 }}>{debugText || '(vazio)'}</pre>
                </details>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Ajuste o recorte para pegar só o valor do preço (ou a linha do item).
              </div>
            </div>
          </div>
        ) : null}

        {mode === 'pick' ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ fontWeight: 600 }}>Escolha o preço encontrado</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {candidates.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="btn btnPrimary"
                  onClick={() => {
                    onPrice(p);
                    stop();
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btnSecondary" onClick={() => setMode('crop')}>
                Voltar ao recorte
              </button>
              <button type="button" className="btn btnSecondary" onClick={() => setMode('live')}>
                Capturar novamente
              </button>
            </div>

            <details style={{ marginTop: 6 }}>
              <summary style={{ cursor: 'pointer' }}>Mostrar texto reconhecido (debug)</summary>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, marginTop: 8 }}>{debugText || '(vazio)'}</pre>
            </details>
          </div>
        ) : null}

        {/* canvas oculto para captura */}
        <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}
