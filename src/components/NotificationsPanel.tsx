'use client';

import { DONE } from '@/lib/constants';
import { daysUntil, fmtLong } from '@/lib/dates';
import { Popover } from './Overlay';
import type { Item } from '@/lib/types';

export interface Notice {
  t: string;
  m: string;
  id: string;
  i: string;
  s: number;
}

/** Overdue and near-deadline items, ported from the reference. */
export function notifications(items: Item[]): Notice[] {
  const out: Notice[] = [];
  items.forEach((it) => {
    if (DONE.includes(it.status)) return;
    const d = daysUntil(it.deadline);
    if (d === null) return;
    if (d < 0) {
      out.push({
        t: 'Overdue content',
        m: `"${it.title}" was due ${fmtLong(it.deadline)}.`,
        id: it.id,
        i: '⚠️',
        s: d,
      });
    } else if (d <= 3) {
      out.push({
        t: d === 0 ? 'Due today' : `Due in ${d} day${d === 1 ? '' : 's'}`,
        m: `"${it.title}" is due ${fmtLong(it.deadline)}.`,
        id: it.id,
        i: '🕑',
        s: d,
      });
    }
  });
  return out.sort((a, b) => a.s - b.s);
}

export default function NotificationsPanel({
  items,
  onOpenItem,
  onClose,
}: {
  items: Item[];
  onOpenItem: (id: string) => void;
  onClose: () => void;
}) {
  const list = notifications(items);

  return (
    <Popover onClose={onClose}>
      <div className="pop-hd">
        <div>
          <b>Notifications</b>
          <div style={{ fontSize: 11, color: 'var(--faint)' }}>
            {list.length ? `${list.length} needing attention` : 'You are all caught up'}
          </div>
        </div>
      </div>
      <div style={{ overflowY: 'auto' }}>
        {list.length ? (
          list.map((n, idx) => (
            <button
              key={n.id + idx}
              className="ntf"
              onClick={() => {
                onClose();
                onOpenItem(n.id);
              }}
            >
              <span>{n.i}</span>
              <span style={{ flex: 1 }}>
                <b>{n.t}</b>
                <p>{n.m}</p>
              </span>
            </button>
          ))
        ) : (
          <div style={{ padding: 34, textAlign: 'center', color: 'var(--faint)', fontSize: 12 }}>
            No notifications yet
          </div>
        )}
      </div>
    </Popover>
  );
}
