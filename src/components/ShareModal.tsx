'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ROLES } from '@/lib/constants';
import { createInvite, inviteUrl } from '@/lib/invites';
import { useToast } from './Toasts';
import { Modal } from './Overlay';
import type { Role } from '@/lib/types';

export default function ShareModal({
  workspaceId,
  workspaceName,
  uid,
  isAdmin,
  onClose,
}: {
  workspaceId: string;
  workspaceName: string;
  uid: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [role, setRole] = useState<Role>('editor');
  const [singleUse, setSingleUse] = useState(false);
  const [days, setDays] = useState(7);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setBusy(true);
    try {
      const invite = await createInvite({
        workspaceId,
        workspaceName,
        role,
        createdBy: uid,
        expiresInDays: days,
        singleUse,
      });
      setLink(inviteUrl(invite.token));
      toast('Invite link created', 'ok');
    } catch {
      toast('Could not create the invite link.', 'err');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast('Link copied', 'ok');
    } catch {
      toast('Copy failed — select the link and copy it manually.', 'err');
    }
  };

  return (
    <Modal
      title="Share workspace"
      subtitle={workspaceName}
      width={520}
      onClose={onClose}
      footer={
        <>
          <Link className="btn" href={`/workspace/${workspaceId}/settings`}>
            Manage members
          </Link>
          <button className="btn pri" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      {!isAdmin ? (
        <div className="note warn" style={{ marginBottom: 0 }}>
          Only workspace admins can create invite links. Ask an admin to send you one.
        </div>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--soft)' }}>
            Anyone with the link can join this workspace at the role you pick. They will be asked
            to sign in first.
          </p>

          <div className="two">
            <label className="fld">
              <span>Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {ROLES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label} — {r.blurb}
                  </option>
                ))}
              </select>
            </label>

            <label className="fld">
              <span>Expires in</span>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                <option value={1}>1 day</option>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={365}>1 year</option>
              </select>
            </label>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12.5,
              color: '#475569',
            }}
          >
            <input
              type="checkbox"
              checked={singleUse}
              onChange={(e) => setSingleUse(e.target.checked)}
              style={{ width: 'auto', boxShadow: 'none' }}
            />
            Single use — the link stops working after one person joins
          </label>

          <button className="btn pri" onClick={generate} disabled={busy}>
            {busy ? 'Generating…' : link ? 'Generate another link' : 'Generate invite link'}
          </button>

          {link && (
            <div>
              <span className="fld-label">Invite link</span>
              <div className="copyrow">
                <input type="text" readOnly value={link} onFocus={(e) => e.target.select()} />
                <button className="btn" onClick={copy}>
                  Copy
                </button>
              </div>
              <div className="note" style={{ marginTop: 10, marginBottom: 0 }}>
                Joining as <b>{ROLES.find((r) => r.key === role)?.label}</b>
                {singleUse ? ' · single use' : ' · reusable'} · expires in {days}{' '}
                {days === 1 ? 'day' : 'days'}.
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
