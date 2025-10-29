// PATH: app/components/ui/PageHeader.tsx
"use client";

import { Group, Title, Text, Stack } from "@mantine/core";
import { ReactNode } from "react";

interface PageHeaderProps {
  /** The main title of the page */
  title: string;
  /** A short description appearing under the title */
  description?: string;
  /** A slot for buttons or controls, aligned to the right */
  rightSection?: ReactNode;
}

/**
 * A standardized header for main dashboard pages.
 * Includes a title, description, and an optional right-aligned section.
 */
export function PageHeader({ title, description, rightSection }: PageHeaderProps) {
  return (
    <Group justify="space-between" mb="lg">
      <Stack gap={0}>
        <Title order={2}>{title}</Title>
        {description && <Text c="dimmed" size="sm">{description}</Text>}
      </Stack>
      
      {rightSection && <Group>{rightSection}</Group>}
    </Group>
  );
}