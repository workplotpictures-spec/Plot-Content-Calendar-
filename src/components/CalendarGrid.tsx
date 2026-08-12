'use client';

import { DAYS } from '@/lib/constants';
import { key, monthGrid, parse, todayKey } from '@/lib/dates';
import type { Item, Member } from '@/lib/types';
import Tile from './Tile';

interface Props {
  current: string;
  itemsOn: (dateKey: string) => Item[];
  membersById: Record<string, Member>;
  canEdit: boolean;
  dragId: string | null;
  dropDate: string | null;
  onOpenItem: (id: string) => void;
  onOpenDay: (dateKey: string) => void;
  onAdd: (dateKey: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverDate: (dateKey: string | null) => void;
  onDropOnDate: (dateKey: string, beforeId: string | null) => void;
}

export default function CalendarGrid({
  current,
  itemsOn,
  membersById,
  canEdit,
  dragId,
  dropDate,
  onOpenItem,
  onOpenDay,
  onAdd,
  onDragStart,
  onDragEnd,
  onDragOverDate,
  onDropOnDate,
}: Props) {
  const cur = parse(current);
  const today = todayKey();

  return (
    <section className="cal">
      <div className="wk-hd">
        {DAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid">
        {monthGrid(cur).map((d) => {
          const k = key(d);
          const out = d.getMonth() !== cur.getMonth();
          const items = itemsOn(k);

          return (
            <div
              key={k}
              className={'cell' + (out ? ' out' : '') + (dropDate === k ? ' drop' : '')}
              data-date={k}
              onClick={() => onOpenDay(k)}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                onDragOverDate(k);
              }}
              onDragLeave={() => onDragOverDate(null)}
              onDrop={(e) => {
                if (!dragId) return;
                e.preventDefault();
                onDropOnDate(k, null);
              }}
            >
              <div className="cell-hd">
                <span className={'daynum' + (k === today ? ' today' : '')}>{d.getDate()}</span>
                <span className="cell-tools">
                  {items.length > 0 && <span className="pill">{items.length}</span>}
                  {canEdit && (
                    <button
                      className="add"
                      title="Add content"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdd(k);
                      }}
                    >
                      +
                    </button>
                  )}
                </span>
              </div>
              <div className="stack">
                {items.map((it) => (
                  <Tile
                    key={it.id}
                    item={it}
                    member={it.assignee ? (membersById[it.assignee] ?? null) : null}
                    canEdit={canEdit}
                    dragging={dragId === it.id}
                    onOpen={onOpenItem}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onDropOnTile={(targetId) => onDropOnDate(k, targetId)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
