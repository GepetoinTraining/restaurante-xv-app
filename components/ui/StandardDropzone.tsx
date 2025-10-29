// PATH: app/components/ui/StandardDropzone.tsx
"use client";

import { Group, Text, rem } from '@mantine/core';
import { IconUpload, IconPhoto, IconX } from '@tabler/icons-react';
import { Dropzone, DropzoneProps, IMAGE_MIME_TYPE } from '@mantine/dropzone';

// Extend the props to pass down any settings
interface StandardDropzoneProps extends Partial<DropzoneProps> {
  onDrop: (files: File[]) => void;
}

/**
 * A standardized Dropzone component for file uploads.
 */
export function StandardDropzone({ onDrop, ...props }: StandardDropzoneProps) {
  return (
    <Dropzone
      onDrop={onDrop}
      onReject={(files) => console.log('rejected files', files)}
      maxSize={5 * 1024 ** 2} // 5MB
      accept={IMAGE_MIME_TYPE} // Default to images, can be overridden by props
      {...props}
    >
      <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
        <Dropzone.Accept>
          <IconUpload
            style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-blue-6)' }}
            stroke={1.5}
          />
        </Dropzone.Accept>
        <Dropzone.Reject>
          <IconX
            style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)' }}
            stroke={1.5}
          />
        </Dropzone.Reject>
        <Dropzone.Idle>
          <IconPhoto
            style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)' }}
            stroke={1.5}
          />
        </Dropzone.Idle>

        <div>
          <Text size="xl" inline>
            Arraste imagens aqui ou clique para selecionar
          </Text>
          <Text size="sm" c="dimmed" inline mt={7}>
            O arquivo deve ter no máximo 5MB
          </Text>
        </div>
      </Group>
    </Dropzone>
  );
}