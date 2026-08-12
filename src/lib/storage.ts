'use client';

import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
} from 'firebase/storage';
import { storage } from './firebase';
import { MAX_UPLOAD_BYTES } from './constants';
import { iconFor, uid } from './utils';
import type { Attachment } from './types';

/** Keeps the object path predictable and free of characters Storage dislikes. */
const safeName = (name: string) => name.replace(/[^\w.\-() ]+/g, '_').slice(0, 120);

/**
 * Uploads one file to workspaces/{wid}/items/{itemId}/{id}-{name} and returns
 * the attachment record stored on the item document.
 */
export async function uploadAttachment(
  wid: string,
  itemId: string,
  file: File,
  uploadedBy: string,
  onProgress?: (pct: number) => void,
): Promise<Attachment> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`${file.name} is larger than the 25 MB limit.`);
  }

  const id = uid();
  const path = `workspaces/${wid}/items/${itemId}/${id}-${safeName(file.name)}`;
  const task = uploadBytesResumable(storageRef(storage, path), file, {
    contentType: file.type || 'application/octet-stream',
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      () => resolve(),
    );
  });

  return {
    id,
    name: file.name,
    size: file.size,
    type: file.type || '',
    kind: iconFor(file.type, file.name),
    path,
    url: await getDownloadURL(task.snapshot.ref),
    uploadedAt: Date.now(),
    uploadedBy,
  };
}

/** Best-effort removal — the item document is the source of truth. */
export async function deleteAttachment(att: Attachment) {
  try {
    await deleteObject(storageRef(storage, att.path));
  } catch {
    // Already gone, or the rules refused. The record is removed either way.
  }
}
