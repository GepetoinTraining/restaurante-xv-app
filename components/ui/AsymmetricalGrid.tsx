// PATH: app/components/ui/AsymmetricalGrid.tsx
"use client";

import { Container, Grid, Paper, Skeleton } from '@mantine/core';
import { ReactNode } from 'react';

// You can pass the actual content in as a children array
interface AsymmetricalGridProps {
  children: ReactNode[];
}

export function AsymmetricalGrid({ children }: AsymmetricalGridProps) {
  // Use a placeholder if no children are provided
  const childPlaceholder = <Skeleton height={140} radius="md" animate={false} />;
  
  const getChild = (index: number) => {
    return children[index] ? <Paper withBorder p="md">{children[index]}</Paper> : childPlaceholder;
  }

  return (
    <Container fluid my="md">
      <Grid>
        <Grid.Col span={{ base: 12, xs: 4 }}>{getChild(0)}</Grid.Col>
        <Grid.Col span={{ base: 12, xs: 8 }}>{getChild(1)}</Grid.Col>
        <Grid.Col span={{ base: 12, xs: 8 }}>{getChild(2)}</Grid.Col>
        <Grid.Col span={{ base: 12, xs: 4 }}>{getChild(3)}</Grid.Col>
        <Grid.Col span={{ base: 12, xs: 3 }}>{getChild(4)}</Grid.Col>
        <Grid.Col span={{ base: 12, xs: 3 }}>{getChild(5)}</Grid.Col>
        <Grid.Col span={{ base: 12, xs: 6 }}>{getChild(6)}</Grid.Col>
      </Grid>
    </Container>
  );
}