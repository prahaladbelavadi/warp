import { apiFetch, type Contact, type Edge, type Message } from '@/lib/api';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface ContactDetail {
  contact: Contact;
  edges: Edge[];
  recent_messages: Message[];
}

function decayLabel(score: number) {
  if (score < 0.1) return { label: 'Active', color: 'text-[#25d366]' };
  if (score < 0.4) return { label: 'Cooling', color: 'text-yellow-400' };
  if (score < 0.7) return { label: 'At risk', color: 'text-orange-400' };
  if (score < 0.9) return { label: 'Dormant', color: 'text-red-400' };
  return { label: 'Lost', color: 'text-red-600' };
}

export default async function ContactPage({ params }: { params: { number: string } }) {
  const number = decodeURIComponent(params.number);
  const data = await apiFetch<ContactDetail>(`/graph/contact/${encodeURIComponent(number)}`).catch(() => null);

  if (!data) notFound();

  const { contact, edges, recent_messages } = data;
  const edge = edges[0];
  const displayName = contact.display_names[0] ?? number;
  const decay = edge ? decayLabel(edge.decay_score) : null;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <Link href="/contacts" className="text-xs text-[#555] hover:text-[#888]">
        ← Contacts
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#2a2a2a] flex items-center justify-center text-xl font-bold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-sm text-[#888]">{number}</p>
          {contact.tier && (
            <span className="text-xs text-[#25d366] mt-0.5 inline-block">Tier {contact.tier}</span>
          )}
        </div>
      </div>

      {/* Edge stats */}
      {edge && (
        <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 space-y-4">
          <h2 className="text-xs font-semibold text-[#888] uppercase tracking-wider">
            Relationship
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Sent', value: edge.messages_sent },
              { label: 'Received', value: edge.messages_received },
              { label: 'Silent days', value: edge.silence_days },
              { label: 'Reciprocity', value: `${Math.round(edge.reciprocity_ratio * 100)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#111] rounded-lg px-3 py-2 text-center">
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-[#888]">{label}</p>
              </div>
            ))}
          </div>

          {/* Decay bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#888]">Decay score</span>
              <span className={decay?.color}>{decay?.label}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#2a2a2a] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  edge.decay_score > 0.7 ? 'bg-red-500' :
                  edge.decay_score > 0.4 ? 'bg-yellow-400' : 'bg-[#25d366]'
                }`}
                style={{ width: `${edge.decay_score * 100}%` }}
              />
            </div>
          </div>

          {/* 30-day activity */}
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-[#888]">Last 30d: </span>
              <span className="font-medium">
                {edge.messages_sent_30d + edge.messages_received_30d} messages
              </span>
            </div>
            <div>
              <span className="text-[#888]">Last seen: </span>
              <span className="font-medium">
                {edge.last_interaction
                  ? new Date(edge.last_interaction).toLocaleDateString()
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Message history */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-[#888] uppercase tracking-wider">
          Recent Messages
        </h2>
        <div className="space-y-2">
          {recent_messages.length === 0 && (
            <p className="text-sm text-[#888]">No messages yet.</p>
          )}
          {recent_messages.map((m) => (
            <div
              key={m.wa_message_id}
              className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                  m.direction === 'outbound'
                    ? 'bg-[#25d366]/20 text-white'
                    : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#e5e5e5]'
                }`}
              >
                <p>{m.body || <span className="italic text-[#888]">[media]</span>}</p>
                <p className="text-xs text-[#888] mt-1 text-right">
                  {new Date(m.timestamp).toLocaleString()}
                  {m.source === 'backfill' && ' · backfill'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
