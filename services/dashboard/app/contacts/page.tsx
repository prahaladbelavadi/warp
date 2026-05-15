import { apiFetch, type Contact } from '@/lib/api';
import Link from 'next/link';

const tierColor: Record<string, string> = {
  A: 'text-[#25d366] border-[#25d366]/30 bg-[#25d366]/10',
  B: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  C: 'text-[#888] border-[#555]/30 bg-[#555]/10',
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { tier?: string };
}) {
  const tier = searchParams.tier?.toUpperCase();
  const path = tier ? `/contacts?tier=${tier}&limit=100` : '/contacts?limit=100';
  const data = await apiFetch<{ contacts: Contact[] }>(path);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-sm text-[#888] mt-1">{data.contacts.length} contacts</p>
        </div>
        {/* Tier filter pills */}
        <div className="flex gap-2">
          {[undefined, 'A', 'B', 'C'].map((t) => (
            <Link
              key={t ?? 'all'}
              href={t ? `/contacts?tier=${t}` : '/contacts'}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                tier === t || (!tier && !t)
                  ? 'bg-[#25d366] border-[#25d366] text-black font-semibold'
                  : 'border-[#2a2a2a] text-[#888] hover:border-[#444]'
              }`}
            >
              {t ? `Tier ${t}` : 'All'}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] divide-y divide-[#2a2a2a]">
        {data.contacts.length === 0 && (
          <p className="px-5 py-8 text-center text-[#888] text-sm">No contacts yet.</p>
        )}
        {data.contacts.map((c) => (
          <Link
            key={c._id}
            href={`/contacts/${encodeURIComponent(c.number)}`}
            className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#222] transition-colors"
          >
            {/* Avatar initial */}
            <div className="w-9 h-9 rounded-full bg-[#2a2a2a] flex items-center justify-center text-sm font-semibold shrink-0">
              {(c.display_names[0] ?? c.number).charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {c.display_names[0] ?? c.number}
              </p>
              <p className="text-xs text-[#888] truncate">{c.number}</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-[#888]">
                {c.message_count.toLocaleString()} msgs
              </span>
              {c.tier && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${tierColor[c.tier]}`}>
                  {c.tier}
                </span>
              )}
              <span className="text-xs text-[#555]">
                {new Date(c.last_seen).toLocaleDateString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
