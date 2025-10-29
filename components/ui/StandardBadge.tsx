// PATH: app/components/ui/StandardBadge.tsx
"use client";

import { Badge, BadgeProps } from '@mantine/core';

interface StandardBadgeProps extends Omit<BadgeProps, "color"> {
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'PROBLEM' | 'ACTIVE' | 'INACTIVE' | 'OPEN' | 'CLOSED' | 'PAID' | 'UNPAID' | string; // Add any status you use
}

export function StandardBadge({ status, ...props }: StandardBadgeProps) {
  const colorMap: Record<string, string> = {
    // Prep Tasks
    PENDING: 'gray',
    ASSIGNED: 'blue',
    IN_PROGRESS: 'yellow',
    PAUSED: 'orange',
    COMPLETED: 'green',
    CANCELLED: 'red',
    PROBLEM: 'red',
    
    // General Status
    ACTIVE: 'green',
    INACTIVE: 'gray',
    OPEN: 'blue',
    CLOSED: 'red',
    PAID: 'teal',
    UNPAID: 'orange',
  };

  return (
    <Badge color={colorMap[status] || 'gray'} {...props}>
      {status.replace('_', ' ')}
    </Badge>
  );
}