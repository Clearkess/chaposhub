/// <reference types="vite/client" />

// Global CDN scripts loaded in index.html (html2canvas, JsBarcode, qrcodejs)
declare function html2canvas(element: HTMLElement, options?: any): Promise<HTMLCanvasElement>
declare function JsBarcode(el: any, text: string, options?: any): void
declare class QRCode {
  constructor(el: HTMLElement, options: any)
  static CorrectLevel: { L: number; M: number; Q: number; H: number }
}
