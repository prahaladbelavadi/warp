'use client';
import { useEffect, useState } from 'react';
import type { Status } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://warp-api-production.up.railway.app';

const statusColor: Record<string, string> = {
  ready: 'bg-[#25d366]',
  loading: 'bg-yellow-400',
  qr: 'bg-blue-400',
  disconnected: 'bg-red-500',
  initializing: 'bg-[#555]',
  unknown: 'bg-[#555]',
};

const statusLabel: Record<string, string> = {
  ready: 'Connected',
  loading: 'Syncing…',
  qr: 'Awaiting QR scan',
  disconnected: 'Disconnected',
  initializing: 'Initializing',
  unknown: 'Unknown',
};

export default function SyncStatus({ initial }: { initial: Status }) {
  const [status, setStatus] = useState(initial);

  useEffect(() => {
    // Poll every 4s while loading, 30s when ready
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const res = await fetch(`${API}/status`, { cache: 'no-store' });
        if (res.ok) setStatus(await res.json());
      } catch { /* ignore */ }
      const delay = status.wa.sessionStatus === 'loading' ? 4000 : 30000;
      timer = setTimeout(poll, delay);
    }
    poll();
    return () => clearTimeout(timer);
  }, []);

  const { wa, archive } = status;
  const isLoading = wa.sessionStatus === 'loading';

  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColor[wa.sessionStatus]}`} />
          <span className="font-medium text-sm">{statusLabel[wa.sessionStatus]}</span>
          {wa.connectedAt && (
            <span className="text-xs text-[#888]">
              since {new Date(wa.connectedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        {isLoading && (
          <span className="text-sm font-mono text-yellow-400">{wa.loadingPercent}%</span>
        )}
      </div>

      {/* Progress bar — visible while loading */}
      {isLoading && (
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-[#2a2a2a] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#25d366] transition-all duration-700"
              style={{ width: `${wa.loadingPercent}%` }}
            />
          </div>
          {wa.loadingMessage && (
            <p className="text-xs text-[#888]">{wa.loadingMessage}</p>
          )}
        </div>
      )}

      {/* Archive stats row */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        {[
          { label: 'Messages', value: archive.messages.toLocaleString() },
          { label: 'Contacts', value: archive.contacts.toLocaleString() },
          { label: 'Relationships', value: archive.edges.toLocaleString() },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-[#111] px-3 py-2 text-center">
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-[#888] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Source breakdown */}
      {archive.messages > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-[#888]">
            <span>Live</span>
            <span>Backfill</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#2a2a2a] overflow-hidden flex">
            <div
              className="h-full bg-[#25d366]"
              style={{ width: `${(archive.live_messages / archive.messages) * 100}%` }}
            />
            <div className="h-full bg-blue-500 flex-1" />
          </div>
          <div className="flex justify-between text-xs text-[#555]">
            <span>{archive.live_messages.toLocaleString()}</span>
            <span>{archive.backfill_messages.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
