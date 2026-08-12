'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ACCEPT_FILES, STATUSES, S, TYPES } from '@/lib/constants';
import { fmtLong } from '@/lib/dates';
import { deleteItem, updateItem } from '@/lib/data';
import { deleteAttachment, uploadAttachment } from '@/lib/storage';
import { bytes, isImage, isVideo, urls } from '@/lib/utils';
import { useToast } from './Toasts';
import { Drawer } from './Overlay';
import RichTextEditor from './RichTextEditor';
import Lightbox from './Lightbox';
import type { Attachment, Brand, Item, Member } from '@/lib/types';

interface Props {
  workspaceId: string;
  uid: string;
  item: Item;
  brands: Brand[];
  members: Member[];
  canEdit: boolean;
  /** Other members with this same item open. */
  alsoEditing: Member[];
  onClose: () => void;
  onAddBrand: (then: (brandId: string) => void) => void;
}

export default function ContentDrawer({
  workspaceId,
  uid,
  item,
  brands,
  members,
  canEdit,
  alsoEditing,
  onClose,
  onAddBrand,
}: Props) {
  const toast = useToast();

  const [title, setTitle] = useState(item.title);
  const [brandId, setBrandId] = useState(item.brandId ?? '');
  const [assignee, setAssignee] = useState(item.assignee ?? '');
  const [type, setType] = useState(item.type ?? '');
  const [deadline, setDeadline] = useState(item.deadline ?? '');
  const [status, setStatus] = useState(item.status);
  const [references, setReferences] = useState(item.references ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const files = item.files ?? [];

  // Attachments are written straight to Firestore on upload, so the tile badge
  // and everyone else's drawer update without waiting for Save.
  const previewable = useMemo(() => files.filter((f) => isImage(f) || isVideo(f)), [files]);
  const rest = useMemo(() => files.filter((f) => !isImage(f) && !isVideo(f)), [files]);

  const links = urls(references);

  const save = async () => {
    const t = title.trim();
    if (!t) return toast('A title is required.', 'err');

    setBusy(true);
    try {
      const b = brands.find((x) => x.id === brandId) ?? null;
      await updateItem(workspaceId, item.id, {
        title: t,
        brandId: b?.id ?? null,
        brandName: b?.name ?? null,
        assignee: assignee || null,
        type: type || null,
        deadline: deadline || null,
        status,
        references,
        notes,
      });
      toast('Saved', 'ok');
      onClose();
    } catch {
      toast('Could not save. Check your access to this workspace.', 'err');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await Promise.all(files.map(deleteAttachment));
      await deleteItem(workspaceId, item.id);
      toast('Content deleted', 'ok');
      onClose();
    } catch {
      toast('Could not delete the content.', 'err');
      setBusy(false);
    }
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!picked.length) return;

    for (const f of picked) {
      setProgress({ name: f.name, pct: 0 });
      try {
        const att = await uploadAttachment(workspaceId, item.id, f, uid, (pct) =>
          setProgress({ name: f.name, pct }),
        );
        await updateItem(workspaceId, item.id, { files: [...(item.files ?? []), att] });
      } catch (err) {
        toast((err as Error).message || `Could not upload ${f.name}.`, 'err');
      }
    }
    setProgress(null);
  };

  const removeFile = async (att: Attachment) => {
    try {
      await updateItem(workspaceId, item.id, {
        files: (item.files ?? []).filter((f) => f.id !== att.id),
      });
      await deleteAttachment(att);
    } catch {
      toast('Could not remove the file.', 'err');
    }
  };

  return (
    <>
      <Drawer
        title="Content Details"
        subtitle={`Scheduled ${fmtLong(item.date)}`}
        onClose={onClose}
        footer={
          <>
            {canEdit && (
              <button
                className="btn danger"
                style={{ marginRight: 'auto' }}
                onClick={remove}
                disabled={busy}
              >
                Delete
              </button>
            )}
            <button className="btn" onClick={onClose}>
              Close
            </button>
            {canEdit && (
              <button className="btn pri" onClick={save} disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            )}
          </>
        }
      >
        {alsoEditing.length > 0 && (
          <div className="note warn" style={{ marginBottom: 0 }}>
            {alsoEditing.map((m) => m.name).join(', ')}{' '}
            {alsoEditing.length === 1 ? 'has' : 'have'} this item open right now — last save wins.
          </div>
        )}

        <label className="fld">
          <span>Content Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canEdit}
          />
        </label>

        <div className="two">
          <label className="fld">
            <span>Brand</span>
            <select
              value={brandId}
              disabled={!canEdit}
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
            <select
              value={assignee}
              disabled={!canEdit}
              onChange={(e) => setAssignee(e.target.value)}
            >
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
            <span>Content Type</span>
            <select value={type} disabled={!canEdit} onChange={(e) => setType(e.target.value)}>
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
            <input
              type="date"
              value={deadline}
              disabled={!canEdit}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </label>
        </div>

        <div>
          <span className="fld-label">Status</span>
          <div className="statuses">
            {STATUSES.map((s) => {
              const on = s.key === status;
              return (
                <button
                  key={s.key}
                  className={'st' + (on ? ' on' : '')}
                  disabled={!canEdit}
                  onClick={() => setStatus(s.key)}
                  style={
                    on
                      ? { color: s.hex, borderColor: s.hex + '55', background: s.hex + '12' }
                      : undefined
                  }
                >
                  <span className="swatch" style={{ background: s.hex }} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="fld">
          <span>References / Links</span>
          <textarea
            value={references}
            disabled={!canEdit}
            onChange={(e) => setReferences(e.target.value)}
            placeholder="Drive links, Notion pages, YouTube references, docs…"
          />
          <div className="linkrow">
            {links.map((u) => (
              <a key={u} href={u} target="_blank" rel="noopener noreferrer">
                {u.replace(/^https?:\/\//, '').slice(0, 44)}
              </a>
            ))}
          </div>
        </label>

        <label className="fld">
          <span>Notes</span>
          <div
            className="editor"
            style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}
          >
            <RichTextEditor
              docKey={item.id}
              html={notes}
              placeholder="Full brief, script, captions, hashtags…"
              onChange={setNotes}
              readOnly={!canEdit}
            />
          </div>
        </label>

        <div>
          <span className="fld-label">Attachments</span>

          {previewable.length > 0 && (
            <div className="thumbs">
              {previewable.map((f) => (
                <div key={f.id} className="thumb" onClick={() => setPreview(f)}>
                  {isVideo(f) ? (
                    <video src={f.url} muted preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.url} alt={f.name} loading="lazy" />
                  )}
                  {canEdit && (
                    <button
                      className="rm"
                      title="Remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(f);
                      }}
                    >
                      ✕
                    </button>
                  )}
                  <span className="cap">{f.name}</span>
                </div>
              ))}
            </div>
          )}

          <div className="files">
            {rest.map((f) => (
              <div key={f.id} className="file">
                <span>{f.kind}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{f.name}</b>
                  <small>{bytes(f.size)}</small>
                </div>
                <a
                  className="btn sm"
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={f.name}
                >
                  Open
                </a>
                {canEdit && (
                  <button className="btn danger sm" onClick={() => removeFile(f)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {canEdit && (
            <>
              <input
                ref={fileInput}
                type="file"
                multiple
                className="hidden"
                accept={ACCEPT_FILES}
                onChange={onPick}
              />
              <button
                className="btn sm"
                style={{ marginTop: 8 }}
                onClick={() => fileInput.current?.click()}
                disabled={!!progress}
              >
                ＋ Add file
              </button>
            </>
          )}

          {progress && (
            <>
              <div className="drophint" style={{ marginTop: 8 }}>
                Uploading {progress.name} — {progress.pct}%
              </div>
              <div className="upl">
                <i style={{ width: `${progress.pct}%` }} />
              </div>
            </>
          )}

          {files.length === 0 && !progress && (
            <div className="drophint" style={{ marginTop: 8 }}>
              Images, video, PDF, DOCX, XLSX. Files upload to Firebase Storage and are visible to
              every member of this workspace.
            </div>
          )}
        </div>
      </Drawer>

      {preview && <Lightbox file={preview} onClose={() => setPreview(null)} />}
    </>
  );
}
