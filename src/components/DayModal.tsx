'use client';

import { S } from '@/lib/constants';
import { fmtDayTitle, fmtLong } from '@/lib/dates';
import { byDeadline, isLate } from '@/lib/utils';
import { Modal } from './Overlay';
import type { Item, Member } from '@/lib/types';

export default function DayModal({
  date,
  items,
  membersById,
  canEdit,
  onOpenItem,
  onCreate,
  onClose,
}: {
  date: string;
  items: Item[];
  membersById: Record<string, Member>;
  canEdit: boolean;
  onOpenItem: (id: string) => void;
  onCreate: (date: string) => void;
  onClose: () => void;
}) {
  const list = byDeadline(items);

  return (
    <Modal
      title={fmtDayTitle(date)}
      subtitle={
        list.length
          ? `${list.length} item${list.length === 1 ? '' : 's'} · sorted by deadline, then creation time`
          : 'This day is empty.'
      }
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Close
          </button>
          {canEdit && (
            <button
              className="btn pri"
              onClick={() => {
                onClose();
                onCreate(date);
              }}
            >
              + Add content
            </button>
          )}
        </>
      }
    >
      {list.length ? (
        list.map((it) => {
          const a = it.assignee ? (membersById[it.assignee] ?? null) : null;
          const st = S[it.status] ?? S['not-started'];
          return (
            <button
              key={it.id}
              className="arow"
              style={{
                width: '100%',
                textAlign: 'left',
                border: '1px solid var(--border)',
                background: '#fff',
              }}
              onClick={() => {
                onClose();
                onOpenItem(it.id);
              }}
            >
              <div className="abar" style={{ background: a?.colour ?? '#CBD5E1' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4>{it.title}</h4>
                <div className="meta">
                  {it.brandName && <span className="chip">{it.brandName}</span>}
                  {it.type && <span className="chip out">{it.type}</span>}
                  <span>{a?.name ?? 'Unassigned'}</span>
                  {it.deadline && (
                    <span className={isLate(it) ? 'due late' : 'due'}>{fmtLong(it.deadline)}</span>
                  )}
                </div>
              </div>
              <span
                className="badge"
                style={{ color: st.hex, borderColor: st.hex + '44', background: st.hex + '12' }}
              >
                {st.label}
              </span>
            </button>
          );
        })
      ) : (
        <div className="blank">
          <b>Nothing scheduled for this date yet</b>
        </div>
      )}
    </Modal>
  );
}
