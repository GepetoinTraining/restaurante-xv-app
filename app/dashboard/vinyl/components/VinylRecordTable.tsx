// PATH: app/dashboard/vinyl/components/VinylRecordTable.tsx
// Refactored component (was vynil/components/VinylRecordTable.tsx)

"use client";

import {
  Table,
  ActionIcon,
  Tooltip,
  Text,
  Loader,
  Group,
  Avatar,
  Badge,
} from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { VinylRecordWithSlot } from "../page"; // Import new type
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";

interface VinylRecordTableProps {
  data: VinylRecordWithSlot[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function VinylRecordTable({
  data,
  isLoading,
  onRefresh,
}: VinylRecordTableProps) {
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este disco?")) return;

    try {
      const res = await fetch("/api/vinyl-records", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data: ApiResponse = await res.json();
      if (data.success) {
        notifications.show({
          title: "Sucesso",
          message: "Disco removido.",
          color: "green",
        });
        onRefresh();
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao remover disco.",
          color: "red",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Erro",
        message: "Erro inesperado.",
        color: "red",
      });
    }
  };

  const rows = data.map((item) => (
    <Table.Tr key={item.id}>
      <Table.Td>
        <Group gap="sm">
          <Avatar size={40} src={item.imageUrl} radius="sm" />
          <div>
            <Text fz="sm" fw={500}>
              {item.title}
            </Text>
            <Text fz="xs" c="dimmed">
              {item.artist}
            </Text>
          </div>
        </Group>
      </Table.Td>
      <Table.Td>{item.genre || "N/A"}</Table.Td>
      <Table.Td>{item.year || "N/A"}</Table.Td>
      <Table.Td>
        <Badge color="gray" variant="light">
          L{item.slot.row} / C{item.slot.column}
        </Badge>
      </Table.Td>
      <Table.Td>{item.positionInSlot}</Table.Td>
      <Table.Td>
        <Tooltip label="Editar">
          <ActionIcon variant="transparent" color="blue">
            <IconPencil size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Remover">
          <ActionIcon
            variant="transparent"
            color="red"
            onClick={() => handleDelete(item.id)}
          >
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
            <Table.Th>Título / Artista</Table.Th>
            <Table.Th>Gênero</Table.Th>
            <Table.Th>Ano</Table.Th>
            <Table.Th>Slot (L/C)</Table.Th>
            <Table.Th>Posição</Table.Th>
            <Table.Th>Ações</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text ta="center">Nenhum disco encontrado</Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}