'use client';

import { useEffect, type ReactNode } from 'react';

/** Escape-to-close, matching the reference's global keydown handler. */
function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

export function Modal({
  title,
  subtitle,
  children,
  footer,
  onClose,
  width,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  width?: number;
}) {
  useEscape(onClose);

  return (
    <div
      className="scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={width ? { maxWidth: width } : undefined}>
        <div className="m-hd">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="x" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        <div className="m-bd">{children}</div>
        {footer && <div className="m-ft">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({
  title,
  subtitle,
  children,
  footer,
  onClose,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  useEscape(onClose);

  return (
    <>
      <div className="scrim" onMouseDown={onClose} />
      <aside className="drawer">
        <div className="m-hd">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="x" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        <div className="m-bd">{children}</div>
        {footer && <div className="m-ft">{footer}</div>}
      </aside>
    </>
  );
}

/** Anchored panel used by filters and notifications. */
export function Popover({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEscape(onClose);

  return (
    <div
      className="scrim"
      style={{ background: 'transparent', backdropFilter: 'none' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pop" onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
