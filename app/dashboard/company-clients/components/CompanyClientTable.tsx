// PATH: app/dashboard/company-clients/components/CompanyClientTable.tsx
'use client';

import { Table, Button, Group, Text, ActionIcon } from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { SerializedCompanyClientWithId } from '../page'; // Assuming this type is defined correctly

interface CompanyClientTableProps {
  data: SerializedCompanyClientWithId[];
  onEdit: (client: SerializedCompanyClientWithId) => void;
  onDelete: (clientId: string) => void;
}

export function CompanyClientTable({ data, onEdit, onDelete }: CompanyClientTableProps) {
  const rows = data.map((client) => (
    <Table.Tr key={client.id}>
      <Table.Td>{client.companyName}</Table.Td>
      {/* --- START FIX: Use correct field names --- */}
      <Table.Td>{client.contactName || 'N/A'}</Table.Td>
      <Table.Td>{client.contactPhone}</Table.Td>
      {/* --- END FIX --- */}
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
    <Table striped highlightOnHover>
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
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
}