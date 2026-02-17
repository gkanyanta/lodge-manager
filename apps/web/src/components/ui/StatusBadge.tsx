'use client';

import { getStatusColor } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = getStatusColor(status);

  return (
    <span className={colorClass}>
      {formatStatus(status)}
    </span>
  );
}
