// PATH: app/dashboard/company-clients/components/CompanyClientTable.tsx
'use client';

import { Table, Button, Group, Text, ActionIcon, Loader, Center } from '@mantine/core'; // Added Loader, Center
import { IconPencil, IconTrash } from '@tabler/icons-react';
// --- START FIX: Remove incorrect import ---
// import { SerializedCompanyClientWithId } from '../page'; // REMOVED - Type comes from props now
// --- END FIX ---
// --- START FIX: Use the type defined and passed by the parent page ---
import { CompanyClientApiResponse } from '../page'; // Assuming type is exported from page.tsx or lib/types.ts
// --- END FIX ---


interface CompanyClientTableProps {
  // --- START FIX: Use the correct type name ---
  data: CompanyClientApiResponse[];
  // --- END FIX ---
  onEdit: (client: CompanyClientApiResponse) => void;
  onDelete: (clientId: string) => void;
  // --- START FIX: Add isLoading prop ---
  isLoading: boolean;
  // --- END FIX ---
}

export function CompanyClientTable({ data, onEdit, onDelete, isLoading }: CompanyClientTableProps) {
  const rows = data.map((client) => (
    <Table.Tr key={client.id}>
      <Table.Td>{client.companyName}</Table.Td>
      {/* Use correct field names from CompanyClient model */}
      <Table.Td>{client.contactName || 'N/A'}</Table.Td>
      <Table.Td>{client.contactPhone}</Table.Td>
      <Table.Td>{client.addressCity || 'N/A'}</Table.Td>
      <Table.Td>{client.employeeCount ?? 'N/A'}</Table.Td>
      <Table.Td>{client.salesPipelineStage || 'N/A'}</Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={() => onEdit(client)}>
            <IconPencil size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => onDelete(client.id)}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table.ScrollContainer minWidth={800}>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Empresa</Table.Th>
            <Table.Th>Contato</Table.Th>
            <Table.Th>Telefone</Table.Th>
            <Table.Th>Cidade</Table.Th>
            <Table.Th>Funcionários</Table.Th>
            <Table.Th>Estágio Venda</Table.Th>
            <Table.Th>Ações</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {/* --- START FIX: Add loading/empty states --- */}
          {isLoading ? (
             <Table.Tr><Table.Td colSpan={7}><Center h={200}><Loader /></Center></Table.Td></Table.Tr>
          ) : rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={7}>
                <Text ta="center" c="dimmed" py="lg">Nenhum cliente B2B encontrado.</Text>
              </Table.Td>
            </Table.Tr>
          )}
          {/* --- END FIX --- */}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}