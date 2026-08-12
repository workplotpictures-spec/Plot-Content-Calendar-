'use client';

import Link from 'next/link';
import { initials } from '@/lib/utils';
import type { CalendarView, Member, Role } from '@/lib/types';

interface Props {
  workspaceId: string;
  workspaceName: string;
  role: Role;
  view: CalendarView;
  setView: (v: CalendarView) => void;
  search: string;
  setSearch: (s: string) => void;
  filterCount: number;
  noticeCount: number;
  /** Members currently connected, for the presence stack. */
  online: Member[];
  me: { name: string; colour: string } | null;
  onFilters: () => void;
  onShare: () => void;
  onAnalytics: () => void;
  onBell: () => void;
  onSignOut: () => void;
}

export default function Header({
  workspaceId,
  workspaceName,
  role,
  view,
  setView,
  search,
  setSearch,
  filterCount,
  noticeCount,
  online,
  me,
  onFilters,
  onShare,
  onAnalytics,
  onBell,
  onSignOut,
}: Props) {
  const shown = online.slice(0, 4);
  const extra = online.length - shown.length;

  return (
    <header className="hdr">
      <div className="logo">
        <div className="mark">26</div>
        <div>
          <h1>2026 Content Calendar</h1>
          <p>
            {workspaceName} · {role}
          </p>
        </div>
      </div>

      <div className="search">
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, notes, brand, assignee, type, status…"
        />
        {search && (
          <button className="clr" title="Clear" onClick={() => setSearch('')}>
            ✕
          </button>
        )}
      </div>

      <div className="spacer" />

      {online.length > 0 && (
        <div className="presence" title={online.map((m) => m.name).join(', ')}>
          {shown.map((m) => (
            <div key={m.id} className="avatar" style={{ background: m.colour, color: '#fff' }}>
              {initials(m.name)}
            </div>
          ))}
          {extra > 0 && <div className="avatar more">+{extra}</div>}
        </div>
      )}

      <div className="seg">
        {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
          <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
            {v === 'month' ? 'Monthly' : v === 'week' ? 'Weekly' : 'Daily'}
          </button>
        ))}
      </div>

      <button className="btn sm" onClick={onFilters}>
        Filters {filterCount > 0 && <span className="pill">{filterCount}</span>}
      </button>
      <button className="btn sm" onClick={onShare}>
        Share
      </button>
      <button className="btn sm" onClick={onAnalytics}>
        Analytics
      </button>
      <Link className="btn sm" href={`/workspace/${workspaceId}/settings`}>
        Settings
      </Link>

      <button className="icobtn" title="Notifications" onClick={onBell}>
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {noticeCount > 0 && (
          <span className="dot-badge">{noticeCount > 99 ? '99+' : noticeCount}</span>
        )}
      </button>

      <button
        className="avatar"
        title={`${me?.name ?? 'You'} — click to sign out`}
        onClick={onSignOut}
        style={me ? { background: me.colour, color: '#fff' } : undefined}
      >
        {me ? initials(me.name) : 'YOU'}
      </button>
    </header>
  );
}
