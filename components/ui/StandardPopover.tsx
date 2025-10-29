// PATH: app/components/ui/StandardPopover.tsx
"use client";

import { Popover, PopoverProps } from '@mantine/core';
import { ReactNode } from 'react';

// Extend Mantine's PopoverProps
interface StandardPopoverProps extends Omit<PopoverProps, "children"> {
  /** The element to click to open the popover (e.g., a Button) */
  target: ReactNode;
  /** The content to show inside the dropdown box */
  content: ReactNode;
}

/**
 * A standardized popover component that acts as a "directional drop".
 * * It automatically handles flipping (going up or down)
 * based on available viewport space by default.
 */
export function StandardPopover({ 
  target, 
  content, 
  ...props 
}: StandardPopoverProps) {
  return (
    <Popover
      position="bottom-start" // This is the preferred position. It will flip to 'top-start' if needed.
      shadow="md"
      withArrow
      {...props} // Allows you to override defaults
    >
      <Popover.Target>
        {target}
      </Popover.Target>

      <Popover.Dropdown>
        {content}
      </Popover.Dropdown>
    </Popover>
  );
}