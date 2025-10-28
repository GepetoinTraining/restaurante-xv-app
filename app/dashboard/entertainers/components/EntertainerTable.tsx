// PATH: app/dashboard/entertainers/components/EntertainerTable.tsx
"use client";

import {
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  Text,
  Loader,
  Avatar,
  Group,
} from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { EntertainerType } from "@prisma/client";
import { SerializedEntertainer } from "../page";
import { formatCurrency } from "@/lib/utils";

interface EntertainerTableProps {
  data: SerializedEntertainer[];
  isLoading: boolean;
  onRefresh: () => void;
  // TODO: Add onEdit and onDelete handlers
}

// CORRECTED: Removed the stray underscore
const formatEntertainerType = (type: EntertainerType) => {
  switch (type) {
    case EntertainerType.BAND:
      return "Banda";
    case EntertainerType.DJ:
      return "DJ";
    default:
      return type;
  }
};

export function EntertainerTable({
  data,
  isLoading,
  onRefresh,
}: EntertainerTableProps) {
  const rows = data.map((item) => (
    <Table.Tr key={item.id}>
      <Table.Td>
        <Group gap="sm">
          <Avatar size={40} src={item.imageUrl} radius={40} />
          <div>
            <Text fz="sm" fw={500}>
              {item.name}
            </Text>
            <Text fz="xs" c="dimmed">
              {item.id}
            </Text>
          </div>
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge color={item.type === EntertainerType.DJ ? "pink" : "orange"}>
          {formatEntertainerType(item.type)}
        </Badge>
      </Table.Td>
      <Table.Td>{item.bio || "N/A"}</Table.Td>
      <Table.Td>
        {item.rate ? formatCurrency(parseFloat(item.rate)) : "N/A"}
      </Table.Td>
      <Table.Td>
        <Tooltip label="Editar">
          <ActionIcon variant="transparent" color="blue">
            <IconPencil size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Remover">
          <ActionIcon variant="transparent" color="red">
            <IconTrash size={18} />
          </ActionIcon>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  ));

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Table.ScrollContainer minWidth={700}>
      <Table verticalSpacing="sm" striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nome</Table.Th>
            <Table.Th>Tipo</Table.Th>
            <Table.Th>Bio</Table.Th>
            <Table.Th>Cachê (R$)</Table.Th>
            <Table.Th>Ações</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text ta="center">Nenhum artista encontrado</Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}