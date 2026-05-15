import { apiFetch, type Status, type GraphSummary } from '@/lib/api';
import SyncStatus from './SyncStatus';
import Link from 'next/link';

const tierColor: Record<string, string> = {
  A: 'text-[#25d366] bg-[#25d36620]',
  B: 'text-yellow-400 bg-yellow-400/10',
  C: 'text-[#888] bg-[#888]/10',
};

const tierDesc: Record<string, string> = {
  A: 'Active & reciprocal — last 14 days',
  B: 'Warm — last 45 days',
  C: 'Weak tie or dormant',
};

function decayBar(score: number) {
  const pct = Math.round(score * 100);
  const color =
    score > 0.7 ? 'bg-red-500' : score > 0.4 ? 'bg-yellow-400' : 'bg-[#25d366]';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[#2a2a2a] overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-[#888] w-8 text-right">{pct}%</span>
    </div>
  );
}

export default async function OverviewPage() {
  const [status, summary] = await Promise.all([
    apiFetch<Status>('/status'),
    apiFetch<GraphSummary>('/graph/summary').catch(() => null),
  ]);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-[#888] mt-1">WhatsApp archive & relationship graph</p>
      </div>

      {/* Sync progress card */}
      <SyncStatus initial={status} />

      {/* Tier breakdown */}
      {summary && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">
            Relationship Tiers
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {(['A', 'B', 'C'] as const).map((tier) => (
              <Link
                key={tier}
                href={`/contacts?tier=${tier}`}
                className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 hover:border-[#3a3a3a] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tierColor[tier]}`}>
                    Tier {tier}
                  </span>
                  <span className="text-2xl font-bold">{summary.tier_counts[tier]}</span>
                </div>
                <p className="text-xs text-[#888] mt-2">{tierDesc[tier]}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Decay risk */}
      {summary && summary.decay_risk.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#888] uppercase tracking-wider">
              Decay Risk — Top 5
            </h2>
            <Link href="/leaderboard" className="text-xs text-[#555] hover:text-[#888]">
              View all →
            </Link>
          </div>
          <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] divide-y divide-[#2a2a2a]">
            {summary.decay_risk.slice(0, 5).map((edge) => (
              <div key={edge._id} className="flex items-center gap-4 px-4 py-3">
                <Link
                  href={`/contacts/${edge.from_number}`}
                  className="w-36 text-sm truncate hover:text-[#25d366]"
                >
                  {edge.from_number}
                </Link>
                <div className="flex-1">{decayBar(edge.decay_score)}</div>
                <span className="text-xs text-[#888] w-20 text-right">
                  {edge.silence_days}d silent
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
