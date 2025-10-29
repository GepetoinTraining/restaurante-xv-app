"use client";

import { Group, Title } from "@mantine/core";
import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  actionButton?: ReactNode;
};

export function PageHeader({ title, actionButton }: PageHeaderProps) {
  return (
    <Group justify="space-between" mb="md">
      <Title order={2}>{title}</Title>
      {actionButton}
    </Group>
  );
}
