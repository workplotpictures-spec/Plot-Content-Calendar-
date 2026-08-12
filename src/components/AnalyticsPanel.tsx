'use client';

import { DONE, STATUSES, S } from '@/lib/constants';
import { daysUntil, fmtLong } from '@/lib/dates';
import { byDeadline, isLate } from '@/lib/utils';
import { Modal } from './Overlay';
import type { Brand, Item, Member } from '@/lib/types';

interface Row {
  label: string;
  colour: string;
  n: number;
}

function Bars({ rows }: { rows: Row[] }) {
  if (!rows.length) return <div className="drophint">No content yet</div>;
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <>
      {rows.map((r) => (
        <div className="bar" key={r.label}>
          <span className="nm">{r.label}</span>
          <span className="track">
            <span className="fill" style={{ width: `${(r.n / max) * 100}%`, background: r.colour }} />
          </span>
          <span className="vl">{r.n}</span>
        </div>
      ))}
    </>
  );
}

export default function AnalyticsPanel({
  items,
  brands,
  members,
  membersById,
  onClose,
}: {
  items: Item[];
  brands: Brand[];
  members: Member[];
  membersById: Record<string, Member>;
  onClose: () => void;
}) {
  const total = items.length;
  const done = items.filter((i) => DONE.includes(i.status)).length;
  const published = items.filter((i) => i.status === 'published').length;
  const pending = total - done;
  const overdue = items.filter(isLate).length;
  const upcoming = items.filter((i) => {
    const d = daysUntil(i.deadline);
    return !DONE.includes(i.status) && d !== null && d >= 0 && d <= 9;
  }).length;
  const rate = total ? Math.round((done / total) * 100) : 0;

  const byBrand: Row[] = brands
    .map((b) => ({
      label: b.name,
      colour: b.colour,
      n: items.filter((i) => i.brandId === b.id).length,
    }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  const byWho: Row[] = members
    .map((m) => ({
      label: m.name,
      colour: m.colour,
      n: items.filter((i) => i.assignee === m.id).length,
    }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  const byStatus: Row[] = STATUSES.map((s) => ({
    label: s.label,
    colour: s.hex,
    n: items.filter((i) => i.status === s.key).length,
  })).filter((x) => x.n > 0);

  const soon = byDeadline(
    items.filter((i) => {
      const d = daysUntil(i.deadline);
      return !DONE.includes(i.status) && d !== null && d >= 0;
    }),
  ).slice(0, 6);

  return (
    <Modal
      title="Analytics"
      subtitle="Live metrics across your 2026 calendar."
      width={900}
      onClose={onClose}
      footer={
        <button className="btn" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="stats">
        <div className="stat">
          <span>Total content</span>
          <b>{total}</b>
        </div>
        <div className="stat">
          <span>Completion</span>
          <b>{rate}%</b>
        </div>
        <div className="stat">
          <span>Published</span>
          <b>{published}</b>
        </div>
        <div className="stat">
          <span>Pending</span>
          <b>{pending}</b>
        </div>
        <div className="stat">
          <span>Upcoming</span>
          <b>{upcoming}</b>
        </div>
        <div className="stat">
          <span>Overdue</span>
          <b style={overdue ? { color: '#DC2626' } : undefined}>{overdue}</b>
        </div>
      </div>

      <div className="panels">
        <div className="panel">
          <h4>Content by brand</h4>
          <p className="sub">How the year splits across the roster.</p>
          <Bars rows={byBrand} />
        </div>

        <div className="panel">
          <h4>Content by assignee</h4>
          <p className="sub">Workload per person.</p>
          <Bars rows={byWho} />
        </div>

        <div className="panel">
          <h4>Completion rate</h4>
          <p className="sub">Published and completed vs everything else.</p>
          <div
            className="donut"
            style={{ background: `conic-gradient(#16A34A 0 ${rate}%, #E2E8F0 ${rate}% 100%)` }}
          >
            <div>
              <b>{rate}%</b>
              <small>
                {done} of {total || 0} done
              </small>
            </div>
          </div>
        </div>

        <div className="panel">
          <h4>Status breakdown</h4>
          <p className="sub">Where each item sits in the pipeline.</p>
          <Bars rows={byStatus} />
        </div>

        <div className="panel" style={{ gridColumn: '1/-1' }}>
          <h4>Upcoming deadlines</h4>
          <p className="sub">Soonest first.</p>
          {soon.length ? (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Assignee</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Due</th>
                </tr>
              </thead>
              <tbody>
                {soon.map((i) => {
                  const a = i.assignee ? (membersById[i.assignee] ?? null) : null;
                  const st = S[i.status] ?? S['not-started'];
                  return (
                    <tr key={i.id}>
                      <td>
                        <b>{i.title}</b>{' '}
                        <small style={{ color: 'var(--faint)' }}>{i.brandName || ''}</small>
                      </td>
                      <td>
                        <span
                          className="swatch"
                          style={{
                            background: a?.colour ?? '#CBD5E1',
                            display: 'inline-block',
                            marginRight: 5,
                          }}
                        />
                        {a?.name ?? 'Unassigned'}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            color: st.hex,
                            borderColor: st.hex + '44',
                            background: st.hex + '12',
                          }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>{fmtLong(i.deadline)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="drophint">Nothing due in the near future.</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
