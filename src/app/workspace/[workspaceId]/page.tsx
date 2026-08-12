'use client';

import { use } from 'react';
import AuthGate from '@/components/AuthGate';
import CalendarApp from '@/components/CalendarApp';

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);

  return (
    <AuthGate>
      <CalendarApp workspaceId={workspaceId} />
    </AuthGate>
  );
}
