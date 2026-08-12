'use client';

import { useEffect, useRef, useState } from 'react';
import { MONTHS } from '@/lib/constants';
import { monthKey, parse } from '@/lib/dates';
import { saveGoal, useGoal } from '@/lib/data';
import RichTextEditor from './RichTextEditor';

export default function GoalsEditor({
  workspaceId,
  current,
  uid,
  canEdit,
}: {
  workspaceId: string;
  current: string;
  uid: string;
  canEdit: boolean;
}) {
  const mk = monthKey(current);
  const goal = useGoal(workspaceId, mk);
  const d = parse(current);

  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onChange = (html: string) => {
    if (!canEdit) return;
    if (timer.current) clearTimeout(timer.current);
    // Same 700ms debounce as the reference's auto-save.
    timer.current = setTimeout(async () => {
      await saveGoal(workspaceId, mk, html, uid);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }, 700);
  };

  return (
    <section className="goals">
      <div className="goals-hd">
        <div className="ic">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1.4" />
          </svg>
        </div>
        <div>
          <b>Monthly Goals</b>
          <span>{`${MONTHS[d.getMonth()]} ${d.getFullYear()}`}</span>
        </div>
        <span className={'saved' + (saved ? ' show' : '')}>Auto-saved</span>
      </div>
      <div className="editor">
        <RichTextEditor
          docKey={mk}
          html={goal?.html ?? ''}
          placeholder="What does the team want to achieve this month?"
          onChange={onChange}
          withLink
          readOnly={!canEdit}
        />
      </div>
    </section>
  );
}
