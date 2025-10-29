// PATH: app/components/ui/GhostModal.tsx
"use client";

import { Modal, ModalProps } from '@mantine/core';

interface GhostModalProps extends ModalProps {}

/**
 * A "chromeless" modal with no background, shadow, or padding.
 * Ideal for lightboxes or showing content directly on the overlay.
 */
export function GhostModal(props: GhostModalProps) {
  return (
    <Modal
      {...props}
      withCloseButton={props.withCloseButton ?? false} // Default to no X button
      shadow={props.shadow ?? 'none'}
      styles={{
        // Customize the overlay (e.G., more blur)
        root: {
          backdropFilter: 'blur(4px)',
        },
        // Remove all modal "chrome"
        header: {
          backgroundColor: 'transparent',
        },
        body: {
          backgroundColor: 'transparent',
          padding: 0,
        },
        content: {
          backgroundColor: 'transparent',
          boxShadow: 'none',
          border: 'none',
        },
      }}
    />
  );
}