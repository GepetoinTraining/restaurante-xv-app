// PATH: app/components/ui/StandardCard.tsx
"use client";

import { Paper, PaperProps, Stack, Title, Text, Group, Box } from '@mantine/core';
import { ReactNode } from 'react';

interface StandardCardProps extends PaperProps {
  children: ReactNode;
  title?: string;
  description?: string;
  rightSection?: ReactNode; // For icons or small buttons
}

export function StandardCard({ 
  children, 
  title, 
  description, 
  rightSection, 
  ...props 
}: StandardCardProps) {
  return (
    <Paper withBorder p="md" radius="md" {...props}>
      <Stack>
        {(title || description || rightSection) && (
          <Group justify="space-between">
            <Stack gap={0}>
              {title && <Title order={4}>{title}</Title>}
              {description && <Text c="dimmed" size="xs">{description}</Text>}
            </Stack>
            {rightSection && <Group>Following{rightSection}</Group>}
          </Group>
        )}
        <Box>{children}</Box>
      </Stack>
    </Paper>
  );
}