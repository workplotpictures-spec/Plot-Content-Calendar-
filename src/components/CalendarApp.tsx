'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MONTHS } from '@/lib/constants';
import {
  addDays,
  addMonths,
  fmtDayTitle,
  key,
  parse,
  todayKey,
  weekDays,
} from '@/lib/dates';
import {
  moveItem,
  updateItem,
  useBrands,
  useItems,
  useMembers,
  useMyRole,
  usePresence,
  useWorkspace,
} from '@/lib/data';
import { useAuth } from '@/lib/auth-context';
import { blankFilters, byBoard, byDeadline, filterCount, matches } from '@/lib/utils';
import type { CalendarView, Filters } from '@/lib/types';

import Header from './Header';
import GoalsEditor from './GoalsEditor';
import CalendarGrid from './CalendarGrid';
import WeekView from './WeekView';
import DayView from './DayView';
import CreateModal from './CreateModal';
import ContentDrawer from './ContentDrawer';
import DayModal from './DayModal';
import AddBrandModal from './AddBrandModal';
import FiltersPanel from './FiltersPanel';
import AnalyticsPanel from './AnalyticsPanel';
import NotificationsPanel, { notifications } from './NotificationsPanel';
import ShareModal from './ShareModal';
import { useToast } from './Toasts';

type Overlay =
  | { kind: 'none' }
  | { kind: 'create'; date: string }
  | { kind: 'details'; id: string }
  | { kind: 'day'; date: string }
  | { kind: 'filters' }
  | { kind: 'analytics' }
  | { kind: 'bell' }
  | { kind: 'share' };

/** Per-user view preferences, kept out of Firestore so they stay personal. */
const prefsKey = (wid: string) => `cc2026.prefs.${wid}`;

export default function CalendarApp({ workspaceId }: { workspaceId: string }) {
  const { user, profile, signOut, setLastWorkspace } = useAuth();
  const toast = useToast();
  const uid = user!.uid;

  const { workspace, missing } = useWorkspace(workspaceId);
  const { role, checked } = useMyRole(workspaceId, uid);
  const { members, membersById } = useMembers(workspaceId);
  const brands = useBrands(workspaceId);
  const { items, loaded } = useItems(workspaceId);

  const [view, setView] = useState<CalendarView>('month');
  const [current, setCurrent] = useState('2026-01-01');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(blankFilters);
  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);
  // Layered above the create modal / details drawer rather than replacing them,
  // so a half-filled form survives adding a brand mid-flow.
  const [brandModal, setBrandModal] = useState<{ then?: (brandId: string) => void } | null>(null);

  const canEdit = role === 'admin' || role === 'editor';
  const isAdmin = role === 'admin';

  // Presence, including which item this tab has open.
  const editingItemId = overlay.kind === 'details' ? overlay.id : null;
  const present = usePresence(workspaceId, uid, editingItemId);

  /* ---------------- preferences ---------------- */

  useEffect(() => {
    try {
      const raw = localStorage.getItem(prefsKey(workspaceId));
      if (raw) {
        const p = JSON.parse(raw);
        if (p.view) setView(p.view);
        if (p.current) setCurrent(p.current);
        if (p.filters) setFilters({ ...blankFilters(), ...p.filters });
      }
    } catch {
      // Corrupt preferences — fall back to the defaults.
    }
  }, [workspaceId]);

  useEffect(() => {
    try {
      localStorage.setItem(prefsKey(workspaceId), JSON.stringify({ view, current, filters }));
    } catch {
      // Private mode or a full quota; preferences are not worth surfacing.
    }
  }, [workspaceId, view, current, filters]);

  useEffect(() => {
    if (role) setLastWorkspace(workspaceId).catch(() => {});
  }, [role, workspaceId, setLastWorkspace]);

  /* ---------------- derived ---------------- */

  const visible = useMemo(
    () => items.filter((i) => matches(i, search, filters, membersById)),
    [items, search, filters, membersById],
  );

  const itemsOn = useCallback(
    (dateKey: string) => byBoard(visible.filter((i) => i.date === dateKey)),
    [visible],
  );

  const notices = useMemo(() => notifications(items), [items]);
  const fc = filterCount(filters);

  const online = useMemo(() => {
    const ids = new Set(present.map((p) => p.uid).filter((id) => id !== uid));
    return members.filter((m) => ids.has(m.id));
  }, [present, members, uid]);

  const alsoEditing = useMemo(() => {
    if (overlay.kind !== 'details') return [];
    const ids = new Set(
      present.filter((p) => p.uid !== uid && p.editingItemId === overlay.id).map((p) => p.uid),
    );
    return members.filter((m) => ids.has(m.id));
  }, [present, members, uid, overlay]);

  const title =
    view === 'month'
      ? (() => {
          const d = parse(current);
          return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
        })()
      : view === 'week'
        ? (() => {
            const w = weekDays(parse(current));
            return `${MONTHS[w[0].getMonth()].slice(0, 3)} ${w[0].getDate()} – ${MONTHS[
              w[6].getMonth()
            ].slice(0, 3)} ${w[6].getDate()}, ${w[6].getFullYear()}`;
          })()
        : fmtDayTitle(current);

  /* ---------------- actions ---------------- */

  const step = (dir: -1 | 1) => {
    const d = parse(current);
    setCurrent(
      key(view === 'month' ? addMonths(d, dir) : addDays(d, view === 'week' ? dir * 7 : dir)),
    );
  };

  const onDropOnDate = async (date: string, beforeId: string | null) => {
    const id = dragId;
    setDropDate(null);
    setDragId(null);
    if (!id || !canEdit) return;
    try {
      await moveItem(workspaceId, items, id, date, beforeId);
    } catch {
      toast('Could not move that item.', 'err');
    }
  };

  const quickPatch = async (id: string, patch: Record<string, unknown>) => {
    try {
      await updateItem(workspaceId, id, patch);
    } catch {
      toast('Could not update that item.', 'err');
    }
  };

  const openBrandModal = (then?: (brandId: string) => void) => setBrandModal({ then });

  /* ---------------- guards ---------------- */

  if (missing) {
    return (
      <div className="centre">
        <div className="card">
          <div className="mark">26</div>
          <h2>Workspace not found</h2>
          <p className="lead">
            This workspace does not exist, or you no longer have access to it.
          </p>
          <Link className="btn pri" href="/">
            Back to your workspaces
          </Link>
        </div>
      </div>
    );
  }

  if (!checked || !workspace) {
    return (
      <div className="centre">
        <div className="spin" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="centre">
        <div className="card">
          <div className="mark">26</div>
          <h2>You are not a member</h2>
          <p className="lead">
            You need an invite link from an admin of <b>{workspace.name}</b> before you can open
            this calendar.
          </p>
          <Link className="btn pri" href="/">
            Back to your workspaces
          </Link>
        </div>
      </div>
    );
  }

  const detailItem =
    overlay.kind === 'details' ? (items.find((i) => i.id === overlay.id) ?? null) : null;

  return (
    <>
      <Header
        workspaceId={workspaceId}
        workspaceName={workspace.name}
        role={role}
        view={view}
        setView={setView}
        search={search}
        setSearch={setSearch}
        filterCount={fc}
        noticeCount={notices.length}
        online={online}
        me={profile ? { name: profile.name, colour: profile.colour } : null}
        onFilters={() => setOverlay({ kind: 'filters' })}
        onShare={() => setOverlay({ kind: 'share' })}
        onAnalytics={() => setOverlay({ kind: 'analytics' })}
        onBell={() => setOverlay({ kind: 'bell' })}
        onSignOut={signOut}
      />

      {role === 'viewer' && (
        <div className="ro-banner">
          You have view-only access to this workspace. Ask an admin for editor access to make
          changes.
        </div>
      )}

      <main>
        <GoalsEditor
          workspaceId={workspaceId}
          current={current}
          uid={uid}
          canEdit={canEdit}
        />

        <div className="toolbar">
          <button className="btn sm" onClick={() => step(-1)} title="Previous">
            ‹
          </button>
          <button className="btn sm" onClick={() => step(1)} title="Next">
            ›
          </button>
          <button className="btn ghost sm" onClick={() => setCurrent(todayKey())}>
            Today
          </button>
          <h2>{title}</h2>
          <div className="spacer" />
          {search.trim() || fc ? (
            <span className="count act">
              {visible.length} of {items.length} shown
            </span>
          ) : (
            <span className="count">
              {items.length} item{items.length === 1 ? '' : 's'} planned
            </span>
          )}
          {canEdit && (
            <button className="btn pri sm" onClick={() => setOverlay({ kind: 'create', date: current })}>
              + New content
            </button>
          )}
        </div>

        {!loaded ? (
          <div className="blank">
            <div className="spin" />
          </div>
        ) : view === 'month' ? (
          <CalendarGrid
            current={current}
            itemsOn={itemsOn}
            membersById={membersById}
            canEdit={canEdit}
            dragId={dragId}
            dropDate={dropDate}
            onOpenItem={(id) => setOverlay({ kind: 'details', id })}
            onOpenDay={(date) => setOverlay({ kind: 'day', date })}
            onAdd={(date) => setOverlay({ kind: 'create', date })}
            onDragStart={setDragId}
            onDragEnd={() => {
              setDragId(null);
              setDropDate(null);
            }}
            onDragOverDate={setDropDate}
            onDropOnDate={onDropOnDate}
          />
        ) : view === 'week' ? (
          <WeekView
            current={current}
            itemsOn={itemsOn}
            membersById={membersById}
            canEdit={canEdit}
            dragId={dragId}
            dropDate={dropDate}
            onOpenItem={(id) => setOverlay({ kind: 'details', id })}
            onOpenDay={(date) => setOverlay({ kind: 'day', date })}
            onAdd={(date) => setOverlay({ kind: 'create', date })}
            onDragStart={setDragId}
            onDragEnd={() => {
              setDragId(null);
              setDropDate(null);
            }}
            onDragOverDate={setDropDate}
            onDropOnDate={onDropOnDate}
          />
        ) : (
          <DayView
            items={byDeadline(visible.filter((i) => i.date === current))}
            members={members}
            membersById={membersById}
            canEdit={canEdit}
            onOpenItem={(id) => setOverlay({ kind: 'details', id })}
            onQuickStatus={(id, status) => quickPatch(id, { status })}
            onQuickAssignee={(id, assignee) => quickPatch(id, { assignee })}
          />
        )}
      </main>

      {/* ---------------- overlays ---------------- */}

      {overlay.kind === 'create' && (
        <CreateModal
          workspaceId={workspaceId}
          uid={uid}
          date={overlay.date}
          brands={brands}
          members={members}
          onClose={() => setOverlay({ kind: 'none' })}
          onAddBrand={(then) => openBrandModal(then)}
        />
      )}

      {overlay.kind === 'details' &&
        (detailItem ? (
          <ContentDrawer
            key={detailItem.id}
            workspaceId={workspaceId}
            uid={uid}
            item={detailItem}
            brands={brands}
            members={members}
            canEdit={canEdit}
            alsoEditing={alsoEditing}
            onClose={() => setOverlay({ kind: 'none' })}
            onAddBrand={(then) => openBrandModal(then)}
          />
        ) : null)}

      {overlay.kind === 'day' && (
        <DayModal
          date={overlay.date}
          items={items.filter((i) => i.date === overlay.date)}
          membersById={membersById}
          canEdit={canEdit}
          onOpenItem={(id) => setOverlay({ kind: 'details', id })}
          onCreate={(date) => setOverlay({ kind: 'create', date })}
          onClose={() => setOverlay({ kind: 'none' })}
        />
      )}

      {brandModal && (
        <AddBrandModal
          workspaceId={workspaceId}
          brands={brands}
          onClose={() => setBrandModal(null)}
          onCreated={brandModal.then}
        />
      )}

      {overlay.kind === 'filters' && (
        <FiltersPanel
          filters={filters}
          setFilters={setFilters}
          brands={brands}
          members={members}
          onClose={() => setOverlay({ kind: 'none' })}
        />
      )}

      {overlay.kind === 'analytics' && (
        <AnalyticsPanel
          items={items}
          brands={brands}
          members={members}
          membersById={membersById}
          onClose={() => setOverlay({ kind: 'none' })}
        />
      )}

      {overlay.kind === 'bell' && (
        <NotificationsPanel
          items={items}
          onOpenItem={(id) => setOverlay({ kind: 'details', id })}
          onClose={() => setOverlay({ kind: 'none' })}
        />
      )}

      {overlay.kind === 'share' && (
        <ShareModal
          workspaceId={workspaceId}
          workspaceName={workspace.name}
          uid={uid}
          isAdmin={isAdmin}
          onClose={() => setOverlay({ kind: 'none' })}
        />
      )}
    </>
  );
}
