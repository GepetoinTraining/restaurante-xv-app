// PATH: app/dashboard/suppliers/components/SupplierTable.tsx
"use client";

// --- FIX: Removed unused 'Button' import ---
import { Table, Group, ActionIcon, Text } from "@mantine/core";
import { Supplier } from "@prisma/client";
import { IconPencil, IconTrash } from "@tabler/icons-react";

interface SupplierTableProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}

export function SupplierTable({
  suppliers,
  onEdit,
  onDelete,
}: SupplierTableProps) {
  if (suppliers.length === 0) {
    return <Text>Nenhum fornecedor encontrado.</Text>;
  }

  const rows = suppliers.map((supplier) => (
    <Table.Tr key={supplier.id}>
      <Table.Td>{supplier.name}</Table.Td>
      <Table.Td>{supplier.contactName || "N/A"}</Table.Td>
      <Table.Td>{supplier.contactPhone || "N/A"}</Table.Td>
      <Table.Td>{supplier.contactEmail || "N/A"}</Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon
            variant="light"
            color="blue"
            onClick={() => onEdit(supplier)}
          >
            <IconPencil size={16} />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="red"
            onClick={() => onDelete(supplier)}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table.ScrollContainer minWidth={600}>
      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nome</Table.Th>
            <Table.Th>Pessoa de Contato</Table.Th>
            <Table.Th>Telefone</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Ações</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    );
  }
