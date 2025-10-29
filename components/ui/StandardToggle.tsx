// PATH: app/components/ui/StandardToggle.tsx
"use client";

import { Switch, SwitchProps, MantineSize } from '@mantine/core';
import { ReactNode } from 'react';

// Extend all SwitchProps
interface StandardToggleProps extends Omit<SwitchProps, 'children'> {
  label: ReactNode;
  description?: ReactNode;
  size?: MantineSize;
}

/**
 * A standardized toggle switch,
 * perfect for toggling view modes or settings.
 */
export function StandardToggle({ 
  label, 
  description, 
  size = 'md', 
  ...props 
}: StandardToggleProps) {
  return (
    <Switch
      label={label}
      description={description}
      size={size}
      {...props}
    />
  );
}