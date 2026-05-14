/** Shared in-memory state for the QR server. */
export const state = {
  qr: null as string | null,      // raw QR string from whatsapp-web.js
  ready: false,                   // true once session authenticates
};
