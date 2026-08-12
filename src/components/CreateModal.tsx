'use client';

import { useState } from 'react';
import { TYPES } from '@/lib/constants';
import { fmtLong } from '@/lib/dates';
import { createItem } from '@/lib/data';
import { esc } from '@/lib/sanitize';
import { useToast } from './Toasts';
import { Modal } from './Overlay';
import type { Brand, Member } from '@/lib/types';

export default function CreateModal({
  workspaceId,
  uid,
  date,
  brands,
  members,
  onClose,
  onAddBrand,
}: {
  workspaceId: string;
  uid: string;
  date: string;
  brands: Brand[];
  members: Member[];
  onClose: () => void;
  onAddBrand: (then: (brandId: string) => void) => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [brandId, setBrandId] = useState('');
  const [assignee, setAssignee] = useState('');
  const [type, setType] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const t = title.trim();
    if (!t) return toast('Give the content a title first.', 'err');

    setBusy(true);
    try {
      const b = brands.find((x) => x.id === brandId) ?? null;
      await createItem(workspaceId, uid, {
        title: t,
        date,
        brandId: b?.id ?? null,
        brandName: b?.name ?? null,
        assignee: assignee || null,
        type: type || null,
        deadline: deadline || null,
        status: 'not-started',
        references: '',
        // Plain textarea in the create flow, so escape it before it becomes HTML.
        notes: esc(notes).replace(/\n/g, '<br>'),
      });
      toast('Content added', 'ok');
      onClose();
    } catch {
      toast('Could not create the content.', 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Create content"
      subtitle={`Scheduled for ${fmtLong(date)}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn pri" onClick={save} disabled={busy}>
            {busy ? 'Creating…' : 'Create content'}
          </button>
        </>
      }
    >
      <label className="fld">
        <span>Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Launch teaser reel"
          autoFocus
        />
      </label>

      <div className="two">
        <label className="fld">
          <span>Brand</span>
          <select
            value={brandId}
            onChange={(e) => {
              if (e.target.value === '__add') {
                onAddBrand((id) => setBrandId(id));
                return;
              }
              setBrandId(e.target.value);
            }}
          >
            <option value="">Select brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
            <option value="__add">＋ Add Brand</option>
          </select>
        </label>

        <label className="fld">
          <span>Kisko Karna Padega</span>
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Select assignee</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.colourName ? ` (${m.colourName})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="fld">
          <span>Content type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Select type</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="fld">
          <span>Deadline</span>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
      </div>

      <label className="fld">
        <span>Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Brief, hook, references…"
        />
      </label>
    </Modal>
  );
}
