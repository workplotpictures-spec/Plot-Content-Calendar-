'use client';

import { S } from '@/lib/constants';
import { fmtShort } from '@/lib/dates';
import { isLate } from '@/lib/utils';
import type { Item, Member } from '@/lib/types';

interface Props {
  item: Item;
  /** Week view renders the taller variant with the assignee row. */
  full?: boolean;
  member: Member | null;
  onOpen: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropOnTile: (targetId: string) => void;
  dragging: boolean;
  canEdit: boolean;
}

export default function Tile({
  item,
  full,
  member,
  onOpen,
  onDragStart,
  onDragEnd,
  onDropOnTile,
  dragging,
  canEdit,
}: Props) {
  const st = S[item.status] ?? S['not-started'];
  const late = isLate(item);
  const hex = member?.colour ?? null;

  return (
    <div
      className={'tile' + (full ? ' full' : '') + (dragging ? ' dragging' : '')}
      draggable={canEdit}
      data-id={item.id}
      style={{
        borderLeftColor: hex ?? '#CBD5E1',
        background: hex ? hex + '0F' : '#fff',
      }}
      onClick={(e) => {
        // The grip is a drag affordance only — clicking it must not open the drawer.
        if ((e.target as HTMLElement).closest('[data-grip]')) return;
        e.stopPropagation();
        onOpen(item.id);
      }}
      onDragStart={(e) => {
        onDragStart(item.id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        if (canEdit) e.preventDefault();
      }}
      onDrop={(e) => {
        if (!canEdit) return;
        e.preventDefault();
        e.stopPropagation();
        onDropOnTile(item.id);
      }}
    >
      <div className="tile-top">
        <span className="grip" data-grip title="Drag to another date">
          <svg width="11" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
            <circle cx="3" cy="3" r="1.4" />
            <circle cx="7" cy="3" r="1.4" />
            <circle cx="3" cy="7" r="1.4" />
            <circle cx="7" cy="7" r="1.4" />
            <circle cx="3" cy="11" r="1.4" />
            <circle cx="7" cy="11" r="1.4" />
          </svg>
        </span>
        <div className="tile-title">{item.title}</div>
        <span className="sdot" style={{ background: st.hex }} title={st.label} />
      </div>

      <div className="tile-meta">
        {item.brandName && <span className="chip">{item.brandName}</span>}
        {item.type && <span className="chip out">{item.type}</span>}
        {item.deadline && (
          <span className={'due' + (late ? ' late' : '')}>
            {late ? '⚠' : '🕑'} {fmtShort(item.deadline)}
          </span>
        )}
        {item.files?.length ? <span className="due">📎 {item.files.length}</span> : null}
      </div>

      {full && member && (
        <div className="who">
          <i style={{ background: member.colour }}>{member.name[0]}</i>
          <span>{member.name}</span>
          <span
            className="badge"
            style={{ color: st.hex, borderColor: st.hex + '44', background: st.hex + '12' }}
          >
            {st.label}
          </span>
        </div>
      )}
    </div>
  );
}
