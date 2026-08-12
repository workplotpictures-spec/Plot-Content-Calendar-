'use client';

import { STATUSES, S } from '@/lib/constants';
import { fmtLong } from '@/lib/dates';
import { isLate } from '@/lib/utils';
import type { Item, Member } from '@/lib/types';

interface Props {
  items: Item[];
  members: Member[];
  membersById: Record<string, Member>;
  canEdit: boolean;
  onOpenItem: (id: string) => void;
  onQuickStatus: (id: string, status: string) => void;
  onQuickAssignee: (id: string, assignee: string | null) => void;
}

export default function DayView({
  items,
  members,
  membersById,
  canEdit,
  onOpenItem,
  onQuickStatus,
  onQuickAssignee,
}: Props) {
  if (!items.length) {
    return (
      <div className="blank">
        <b>No content for this day</b>
        <small>Use “New content” to plan something.</small>
      </div>
    );
  }

  return (
    <section className="agenda">
      {items.map((it) => {
        const a = it.assignee ? (membersById[it.assignee] ?? null) : null;
        const st = S[it.status] ?? S['not-started'];
        const late = isLate(it);

        return (
          <div key={it.id} className="arow" onClick={() => onOpenItem(it.id)}>
            <div className="abar" style={{ background: a?.colour ?? '#CBD5E1' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4>{it.title}</h4>
              <div className="meta">
                {it.brandName && <span className="chip">{it.brandName}</span>}
                {it.type && <span className="chip out">{it.type}</span>}
                <span className={late ? 'due late' : 'due'}>
                  {it.deadline ? `Deadline ${fmtLong(it.deadline)}` : 'No deadline'}
                </span>
                {it.files?.length ? <span>📎 {it.files.length}</span> : null}
                <span
                  className="badge"
                  style={{ color: st.hex, borderColor: st.hex + '44', background: st.hex + '12' }}
                >
                  {st.label}
                </span>
              </div>
            </div>

            <div className="quick" onClick={(e) => e.stopPropagation()}>
              <select
                className="mini"
                value={it.status}
                disabled={!canEdit}
                onChange={(e) => onQuickStatus(it.id, e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                className="mini"
                value={it.assignee ?? ''}
                disabled={!canEdit}
                onChange={(e) => onQuickAssignee(it.id, e.target.value || null)}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      })}
    </section>
  );
}
