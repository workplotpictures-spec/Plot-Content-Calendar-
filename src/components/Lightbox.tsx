'use client';

import { useEffect } from 'react';
import { bytes, isVideo } from '@/lib/utils';
import type { Attachment } from '@/lib/types';

export default function Lightbox({
  file,
  onClose,
}: {
  file: Attachment;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    // Capture phase so the lightbox closes before the drawer beneath it does.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div
      className="lightbox"
      onClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.lb-x')) onClose();
      }}
    >
      {isVideo(file) ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={file.url} controls autoPlay />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={file.url} alt={file.name} />
      )}
      <button className="lb-x" title="Close">
        ✕
      </button>
      <div className="lb-nm">
        {file.name} · {bytes(file.size)}
      </div>
    </div>
  );
}
