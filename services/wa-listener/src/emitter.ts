import axios from 'axios';

const WEBHOOK_URL = process.env.WEBHOOK_URL!;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;

export async function emitEvent(event: Record<string, unknown>): Promise<void> {
  try {
    await axios.post(WEBHOOK_URL, event, {
      headers: {
        'Content-Type': 'application/json',
        'X-WARP-Secret': WEBHOOK_SECRET,
      },
      timeout: 5000,
    });
  } catch (err) {
    console.error('[WARP] Webhook emit failed:', err);
    // Do not crash — message still processed, just log failure
  }
}
