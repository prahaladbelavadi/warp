import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'WARP',
  description: 'WhatsApp Analytics, Relationships & Pipeline',
};

const nav = [
  { href: '/', label: 'Overview' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/leaderboard', label: 'Decay Watch' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-52 shrink-0 border-r border-[#2a2a2a] bg-[#111] flex flex-col">
            <div className="px-5 py-6 border-b border-[#2a2a2a]">
              <span className="text-lg font-bold tracking-tight">WARP</span>
              <p className="text-xs text-[#888] mt-0.5">Relationship graph</p>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {nav.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center px-3 py-2 rounded-lg text-sm text-[#aaa] hover:text-white hover:bg-[#222] transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main */}
          <main className="flex-1 overflow-auto p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
