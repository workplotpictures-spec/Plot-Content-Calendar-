'use client';

import { useState } from 'react';
import { BRAND_COLOURS } from '@/lib/constants';
import { createBrand } from '@/lib/data';
import { useToast } from './Toasts';
import { Modal } from './Overlay';
import type { Brand } from '@/lib/types';

export default function AddBrandModal({
  workspaceId,
  brands,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  brands: Brand[];
  onClose: () => void;
  onCreated?: (brandId: string) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [colour, setColour] = useState(
    () => BRAND_COLOURS[Math.floor(Math.random() * BRAND_COLOURS.length)],
  );
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return toast('Enter a brand name.', 'err');
    if (brands.some((b) => b.name.toLowerCase() === trimmed.toLowerCase()))
      return toast('That brand already exists.', 'err');

    setBusy(true);
    try {
      const id = await createBrand(workspaceId, trimmed, colour);
      toast(`${trimmed} added`, 'ok');
      onCreated?.(id);
      onClose();
    } catch {
      toast('Could not add the brand.', 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Add brand"
      subtitle="Available in every dropdown straight away."
      width={420}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn pri" onClick={save} disabled={busy}>
            Add brand
          </button>
        </>
      }
    >
      <label className="fld">
        <span>Brand name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. NORTHSTAR"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
      </label>

      <div>
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '.6px',
            textTransform: 'uppercase',
            color: 'var(--soft)',
            display: 'block',
            marginBottom: 8,
          }}
        >
          Colour
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {BRAND_COLOURS.map((c) => (
            <button
              key={c}
              onClick={() => setColour(c)}
              title={c}
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                border: 0,
                background: c,
                outline: c === colour ? '2px solid #0F172A' : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
