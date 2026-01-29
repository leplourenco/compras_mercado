declare module 'tesseract.js' {
  export type TesseractWorker = {
    loadLanguage: (lang: string) => Promise<void>;
    initialize: (lang: string) => Promise<void>;
    setParameters: (params: Record<string, any>) => Promise<void>;
    recognize: (
      image: HTMLCanvasElement | HTMLImageElement | string
    ) => Promise<{ data: { text: string } }>;
    terminate: () => Promise<void>;
  };

  export function createWorker(options?: Record<string, any>): Promise<TesseractWorker>;
}
