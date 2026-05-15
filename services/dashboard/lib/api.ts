const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://warp-api-production.up.railway.app';

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

// ---- Types ----

export interface Status {
  archive: {
    messages: number;
    contacts: number;
    edges: number;
    backfill_messages: number;
    live_messages: number;
  };
  wa: {
    sessionStatus: 'initializing' | 'qr' | 'loading' | 'ready' | 'disconnected' | 'unknown';
    loadingPercent: number;
    loadingMessage: string;
    ready: boolean;
    connectedAt: number | null;
  };
}

export interface Contact {
  _id: string;
  number: string;
  name?: string;
  display_names: string[];
  message_count: number;
  tier?: 'A' | 'B' | 'C';
  last_seen: string;
  first_seen: string;
  groups: string[];
}

export interface Edge {
  _id: string;
  from_number: string;
  to_number: string;
  messages_sent: number;
  messages_received: number;
  reciprocity_ratio: number;
  decay_score: number;
  silence_days: number;
  last_interaction: string;
  messages_sent_30d: number;
  messages_received_30d: number;
}

export interface Message {
  _id: string;
  wa_message_id: string;
  from_number: string;
  to_number: string;
  body: string;
  message_type: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  contact_name?: string;
  source: 'live' | 'backfill';
}

export interface GraphSummary {
  tier_counts: { A: number; B: number; C: number };
  decay_risk: Edge[];
  most_active_30d: Edge[];
}
