'use client';

import { use } from 'react';
import AuthGate from '@/components/AuthGate';
import MembersSettings from '@/components/MembersSettings';

export default function SettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);

  return (
    <AuthGate>
      <MembersSettings workspaceId={workspaceId} />
    </AuthGate>
  );
}
