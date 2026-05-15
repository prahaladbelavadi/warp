import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface LeaderboardEntry {
  from_number: string;
  to_number: string;
  decay_score: number;
  silence_days: number;
  reciprocity_ratio: number;
  last_interaction: string;
  contact_info?: { name?: string; tier?: string; display_names?: string[] };
}

function decayColor(score: number) {
  if (score > 0.7) return 'bg-red-500';
  if (score > 0.4) return 'bg-yellow-400';
  return 'bg-[#25d366]';
}

function decayLabel(score: number) {
  if (score > 0.9) return 'Lost';
  if (score > 0.7) return 'Dormant';
  if (score > 0.4) return 'At risk';
  if (score > 0.1) return 'Cooling';
  return 'Active';
}

export default async function LeaderboardPage() {
  const data = await apiFetch<{ leaderboard: LeaderboardEntry[] }>(
    '/graph/decay-leaderboard?limit=50'
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Decay Watch</h1>
        <p className="text-sm text-[#888] mt-1">
          Relationships ranked by decay — highest risk at top
        </p>
      </div>

      <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] divide-y divide-[#2a2a2a]">
        {data.leaderboard.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-[#888]">
            No data yet — graph engine runs every 6 hours.
          </p>
        )}
        {data.leaderboard.map((entry, i) => {
          const name =
            entry.contact_info?.display_names?.[0] ??
            entry.contact_info?.name ??
            entry.from_number;
          const pct = Math.round(entry.decay_score * 100);

          return (
            <div key={`${entry.from_number}-${i}`} className="flex items-center gap-4 px-5 py-3.5">
              {/* Rank */}
              <span className="text-xs font-mono text-[#555] w-6 shrink-0">{i + 1}</span>

              {/* Name */}
              <Link
                href={`/contacts/${encodeURIComponent(entry.from_number)}`}
                className="w-40 text-sm truncate hover:text-[#25d366] shrink-0"
              >
                {name}
              </Link>

              {/* Bar */}
              <div className="flex-1 space-y-0.5">
                <div className="h-1.5 w-full rounded-full bg-[#2a2a2a] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${decayColor(entry.decay_score)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Score */}
              <span className="text-xs font-mono w-8 text-right">{pct}%</span>

              {/* Label */}
              <span className={`text-xs w-16 text-right ${
                entry.decay_score > 0.7 ? 'text-red-400' :
                entry.decay_score > 0.4 ? 'text-yellow-400' : 'text-[#25d366]'
              }`}>
                {decayLabel(entry.decay_score)}
              </span>

              {/* Silence */}
              <span className="text-xs text-[#555] w-20 text-right shrink-0">
                {entry.silence_days}d silent
              </span>

              {/* Tier */}
              {entry.contact_info?.tier && (
                <span className="text-xs text-[#888] w-6 text-right">{entry.contact_info.tier}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
