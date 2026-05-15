import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import { emitEvent } from './emitter';
import { state } from './state';

export function createClient(): Client {
  return new Client({
    authStrategy: new LocalAuth({
      dataPath: process.env.WA_SESSION_DATA_PATH ?? '/data/session',
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    },
  });
}

export function attachListeners(client: Client): void {
  client.on('qr', (qr) => {
    state.qr = qr;
    state.ready = false;
    state.sessionStatus = 'qr';
    console.log('[WARP] QR received — open the QR page to scan');
    require('qrcode-terminal').generate(qr, { small: true });
  });

  client.on('loading_screen', (percent: number, message: string) => {
    state.sessionStatus = 'loading';
    state.loadingPercent = percent;
    state.loadingMessage = message;
    console.log(`[WARP] Loading ${percent}% — ${message}`);
  });

  client.on('authenticated', () => {
    state.qr = null;
    state.sessionStatus = 'loading';
    console.log('[WARP] Authenticated');
  });

  client.on('ready', () => {
    state.ready = true;
    state.qr = null;
    state.sessionStatus = 'ready';
    state.loadingPercent = 100;
    state.loadingMessage = 'Connected';
    state.connectedAt = Date.now();
    console.log('[WARP] WA session ready');
    emitEvent({ type: 'session.ready', ts: Date.now() });
  });

  client.on('disconnected', (reason) => {
    state.ready = false;
    state.sessionStatus = 'disconnected';
    console.error('[WARP] Disconnected:', reason);
    process.exit(1);
  });

  client.on('message', async (msg: Message) => {
    // Read-only: never call msg.reply() or any send method
    const payload = await buildPayload(msg, 'inbound');
    await emitEvent({ type: 'message.received', payload });
  });

  client.on('message_create', async (msg: Message) => {
    if (msg.fromMe) {
      const payload = await buildPayload(msg, 'outbound');
      await emitEvent({ type: 'message.sent', payload });
    }
  });
}

async function buildPayload(msg: Message, direction: 'inbound' | 'outbound') {
  const contact = await msg.getContact();
  const chat = await msg.getChat();
  return {
    wa_message_id: msg.id._serialized,
    from: msg.from,
    to: msg.to,
    author: msg.author ?? msg.from,
    body: msg.body,
    type: msg.type,
    timestamp: msg.timestamp,
    direction,
    is_group: chat.isGroup,
    group_id: chat.isGroup ? chat.id._serialized : null,
    group_name: chat.isGroup ? chat.name : null,
    contact_name: contact.pushname ?? contact.name ?? null,
    contact_number: contact.number,
    has_media: msg.hasMedia,
    quoted_message_id: msg.hasQuotedMsg ? (await msg.getQuotedMessage())?.id?._serialized : null,
  };
}
