// PATH: app/dashboard/ingredients/components/IngredientTable.tsx
"use client";

import {
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  Text,
  Loader,
  Group,
} from "@mantine/core";
import { IconPencil, IconTrash, IconToolsKitchen3 } from "@tabler/icons-react"; // Added IconToolsKitchen3
import { SerializedIngredientDef } from "../page";
import { formatCurrency } from "@/lib/utils";
import { ApiResponse } from '@/lib/types';
import { notifications } from '@mantine/notifications';
import { useMutation } from '@tanstack/react-query'; // No queryClient needed here directly

interface IngredientTableProps {
  data: SerializedIngredientDef[];
  isLoading: boolean;
  onRefresh: () => void;
  // TODO: Add onEdit handler, potentially pass to open modal
}

export function IngredientTable({
  data,
  isLoading,
  onRefresh,
}: IngredientTableProps) {

  const deleteIngredient = useMutation({ // Renamed mutation hook
    mutationFn: (id: string) => fetch('/api/ingredients', { // Use correct endpoint
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      }).then(res => res.json()),
    onSuccess: (data: ApiResponse, variables) => {
        if (data.success) {
            notifications.show({
                title: 'Sucesso',
                message: `Ingrediente excluído.`,
                color: 'green',
            });
            onRefresh();
        } else {
             notifications.show({ title: 'Erro', message: data.error || 'Falha ao excluir', color: 'red' });
        }
    },
    onError: (error: any) => {
         notifications.show({ title: 'Erro ao Excluir', message: error.message, color: 'red' });
    }
});


  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o ingrediente "${name}"? Isso só é possível se não houver estoque ou receitas associadas.`)) return;
    deleteIngredient.mutate(id); // Use mutation
  };


  const rows = data.map((item) => {
    const cost = parseFloat(item.costPerUnit);

    return (
      <Table.Tr key={item.id}>
        <Table.Td>
            <Group gap="xs">
                 <Text fw={500}>{item.name}</Text>
                 {item.isPrepared && (
                    <Tooltip label="Item Preparado Internamente">
                        <Badge variant='light' color='cyan' size='sm' circle>
                            <IconToolsKitchen3 size={12} />
                        </Badge>
                    </Tooltip>
                 )}
             </Group>
        </Table.Td>
        <Table.Td>{item.unit}</Table.Td>
        <Table.Td>{formatCurrency(cost)}</Table.Td>
        <Table.Td>
          <Group gap="xs" wrap="nowrap">
            <Tooltip label="Editar Definição (Em breve)">
              <ActionIcon variant="transparent" color="gray" disabled>
                <IconPencil size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Remover Definição">
              <ActionIcon
                variant="transparent"
                color="red"
                onClick={() => handleDelete(item.id, item.name)}
                loading={deleteIngredient.isPending && deleteIngredient.variables === item.id} // Show loading on icon
                >
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Table.ScrollContainer minWidth={500}>
      <Table verticalSpacing="sm" striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nome</Table.Th>
            <Table.Th>Unidade Base (UN)</Table.Th>
            <Table.Th>Custo por UN</Table.Th>
            <Table.Th>Ações</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={4}>
                <Text ta="center">Nenhum ingrediente definido</Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}