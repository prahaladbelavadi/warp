/** Shared in-memory state for the QR server and status endpoint. */
export const state = {
  qr: null as string | null,        // raw QR string from whatsapp-web.js
  ready: false,                     // true once session authenticates
  sessionStatus: 'initializing' as 'initializing' | 'qr' | 'loading' | 'ready' | 'disconnected',
  loadingPercent: 0,                // 0-100 during WA initial sync
  loadingMessage: '',               // e.g. "Loading chats..."
  connectedAt: null as number | null,
};
