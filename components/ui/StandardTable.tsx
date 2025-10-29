// PATH: app/components/ui/StandardTable.tsx
"use client";

import { Table, ScrollArea, Skeleton, Center, Text } from '@mantine/core';
import { ReactNode } from 'react';

interface StandardTableProps {
  headers: string[];
  children: ReactNode; // This will be the <tbody>
  isLoading: boolean;
  isEmpty: boolean;
  emptyMessage?: string;
}

export function StandardTable({ 
  headers, 
  children, 
  isLoading, 
  isEmpty, 
  emptyMessage = "Nenhum item encontrado." 
}: StandardTableProps) {
  const ths = (
    <tr>
      {headers.map((header) => <th key={header}>{header}</th>)}
    </tr>
  );

  return (
    <ScrollArea>
      <Table miw={600} verticalSpacing="sm" striped highlightOnHover>
        <thead>{ths}</thead>
        <tbody>
          {isLoading && (
            // Show skeleton rows
            Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>
                <td colSpan={headers.length}>
                  <Skeleton height={30} mt="sm" />
                </td>
              </tr>
            ))
          )}
          {!isLoading && !isEmpty && children}
        </tbody>
      </Table>
      {!isLoading && isEmpty && (
        <Center p="xl">
          <Text c="dimmed">{emptyMessage}</Text>
        </Center>
      )}
    </ScrollArea>
  );
}