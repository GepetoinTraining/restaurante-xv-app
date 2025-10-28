// PATH: app/dashboard/suppliers/components/SupplierTable.tsx
"use client";

import {
  Table,
  ActionIcon,
  Tooltip,
  Text,
  Loader,
  Group,
  Center,
} from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { Supplier } from "@prisma/client";

interface SupplierTableProps {
  data: Supplier[];
  isLoading: boolean;
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: string) => void;
}

export function SupplierTable({ data, isLoading, onEdit, onDelete }: SupplierTableProps) {
  const rows = data.map((supplier) => (
    <Table.Tr key={supplier.id}>
      <Table.Td>
        <Text fw={500}>{supplier.name}</Text>
      </Table.Td>
      <Table.Td>{supplier.contactPerson || "N/A"}</Table.Td>
      <Table.Td>{supplier.phone || "N/A"}</Table.Td>
      <Table.Td>{supplier.email || "N/A"}</Table.Td>
      <Table.Td>{supplier.address || "N/A"}</Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <Tooltip label="Editar Fornecedor">
            <ActionIcon variant="subtle" color="yellow" onClick={() => onEdit(supplier)}>
              <IconPencil size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Excluir Fornecedor">
            <ActionIcon variant="subtle" color="red" onClick={() => onDelete(supplier.id)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table.ScrollContainer minWidth={800}>
      <Table verticalSpacing="sm" striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nome</Table.Th>
            <Table.Th>Contato</Table.Th>
            <Table.Th>Telefone</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Endereço</Table.Th>
            <Table.Th>Ações</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading ? (
             <Table.Tr><Table.Td colSpan={6}><Center h={200}><Loader /></Center></Table.Td></Table.Tr>
          ) : rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text ta="center" c="dimmed" py="lg">Nenhum fornecedor encontrado.</Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
