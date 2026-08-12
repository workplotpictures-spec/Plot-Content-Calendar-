'use client';

import { STATUSES, TYPES } from '@/lib/constants';
import { blankFilters } from '@/lib/utils';
import { Popover } from './Overlay';
import type { Brand, Filters, Member } from '@/lib/types';

type Group = 'brands' | 'assignees' | 'statuses' | 'types';

export default function FiltersPanel({
  filters,
  setFilters,
  brands,
  members,
  onClose,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  brands: Brand[];
  members: Member[];
  onClose: () => void;
}) {
  const toggle = (group: Group, value: string, checked: boolean) => {
    setFilters({
      ...filters,
      [group]: checked
        ? [...filters[group], value]
        : filters[group].filter((x) => x !== value),
    });
  };

  const box = (group: Group, val: string, label: string, colour?: string) => (
    <label key={group + val}>
      <input
        type="checkbox"
        checked={filters[group].includes(val)}
        onChange={(e) => toggle(group, val, e.target.checked)}
      />
      {colour && <span className="swatch" style={{ background: colour }} />}
      {label}
    </label>
  );

  return (
    <Popover onClose={onClose}>
      <div className="pop-hd">
        <b>Advanced filters</b>
        <button
          className="btn ghost sm"
          onClick={() => {
            setFilters(blankFilters());
            onClose();
          }}
        >
          Clear
        </button>
      </div>
      <div className="pop-bd">
        <div className="fgroup">
          <span>Brand</span>
          <div className="checks">{brands.map((b) => box('brands', b.id, b.name, b.colour))}</div>
        </div>

        <div className="fgroup">
          <span>Assignee</span>
          <div className="checks">
            {members.map((m) => box('assignees', m.id, m.name, m.colour))}
          </div>
        </div>

        <div className="fgroup">
          <span>Status</span>
          <div className="checks">
            {STATUSES.map((s) => box('statuses', s.key, s.label, s.hex))}
          </div>
        </div>

        <div className="fgroup">
          <span>Content type</span>
          <div className="checks">{TYPES.map((t) => box('types', t, t))}</div>
        </div>

        <div className="fgroup">
          <span>Deadline range</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </div>
        </div>
      </div>
    </Popover>
  );
}
