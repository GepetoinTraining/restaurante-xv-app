// PATH: app/components/ui/StandardPill.tsx
"use client";

import { Pill, PillProps } from '@mantine/core';
import { ReactNode } from 'react';

// Extend Mantine's PillProps to accept all its standard props
interface StandardPillProps extends PillProps {
  children: ReactNode;
  // You can add custom variants here later if needed
}

/**
 * A standardized pill component for use in tags, filters, or labels.
 */
export function StandardPill({ children, ...props }: StandardPillProps) {
  return (
    <Pill {...props}>
      {children}
    </Pill>
  );
}