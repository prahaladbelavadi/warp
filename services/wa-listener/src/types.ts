export interface WARPEvent {
  type: string;
  ts?: number;
  payload?: Record<string, unknown>;
}

export interface MessagePayload {
  wa_message_id: string;
  from: string;
  to: string;
  author: string;
  body: string;
  type: string;
  timestamp: number;
  direction: 'inbound' | 'outbound';
  is_group: boolean;
  group_id: string | null;
  group_name: string | null;
  contact_name: string | null;
  contact_number: string;
  has_media: boolean;
  quoted_message_id: string | null;
}
