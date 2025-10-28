// PATH: app/dashboard/prep-recipes/components/PrepRecipeTable.tsx
"use client";

import {
  Table,
  ActionIcon,
  Tooltip,
  Text,
  Loader,
  Group,
  Stack,
  Button,
  Badge // Added Badge
} from "@mantine/core";
import { IconPencil, IconTrash, IconInputAi, IconOutlet, IconPlayerPlay } from "@tabler/icons-react";
import { SerializedPrepRecipe, ApiResponse, StorageLocation } from "@/lib/types"; // Added StorageLocation
import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'; // Added useQuery
import { useState } from 'react';
import { ExecutePrepTaskModal } from './ExecutePrepTaskModal';
// Removed VenueObject import as StorageLocation is now typed

interface PrepRecipeTableProps {
  data: SerializedPrepRecipe[];
  isLoading: boolean;
  onRefresh: () => void;
  onEdit: (prepRecipe: SerializedPrepRecipe) => void;
}

export function PrepRecipeTable({
  data,
  isLoading,
  onRefresh,
  onEdit,
}: PrepRecipeTableProps) {
  const queryClient = useQueryClient();
  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [recipeToExecute, setRecipeToExecute] = useState<SerializedPrepRecipe | null>(null);

  // Fetch Storage Locations for the modal
  const { data: locations, isLoading: isLoadingLocations } = useQuery<StorageLocation[]>({
      queryKey: ['storageLocations'], // Use dedicated key
      queryFn: async () => {
          const res = await fetch("/api/storage-locations"); // Use the new endpoint
          const result: ApiResponse<StorageLocation[]> = await res.json();
          if (result.success && result.data) {
              return result.data;
          }
          throw new Error(result.error || "Falha ao buscar locais de estoque");
      },
      staleTime: 5 * 60 * 1000, // Cache locations for 5 mins
  });


  const deletePrepRecipe = useMutation<ApiResponse<{ id: string }>, Error, string>({
    mutationFn: (id: string) =>
      fetch(`/api/prep-recipes/${id}`, { method: "DELETE" })
      .then(res => {
          if (!res.ok) {
              return res.json().then(errData => {
                  throw new Error(errData.error || `HTTP error! status: ${res.status}`);
              }).catch(() => { throw new Error(`HTTP error! status: ${res.status}`); });
          }
          return res.json()
      }),
    onSuccess: (data, variables) => {
        if (data.success) {
            notifications.show({ title: 'Sucesso', message: `Receita excluída.`, color: 'green' });
            queryClient.invalidateQueries({ queryKey: ['prepRecipes'] });
        } else { notifications.show({ title: 'Erro', message: data.error || 'Falha ao excluir', color: 'red' }); }
    },
    onError: (error: Error, variables) => {
         notifications.show({ title: 'Erro ao Excluir', message: error.message, color: 'red' });
    }
  });

  const handleDeleteClick = (recipe: SerializedPrepRecipe) => {
      if (confirm(`Tem certeza que deseja excluir a receita "${recipe.name}"? Esta ação não pode ser desfeita e só funcionará se a receita não tiver sido usada em Tarefas de Preparo.`)) {
          deletePrepRecipe.mutate(recipe.id);
      }
  };

  const handleOpenExecuteModal = (recipe: SerializedPrepRecipe) => {
      setRecipeToExecute(recipe);
      setIsExecuteModalOpen(true);
  }

   const handleCloseExecuteModal = () => {
      setRecipeToExecute(null);
      setIsExecuteModalOpen(false);
   }

   const handleExecuteSuccess = () => {
       handleCloseExecuteModal();
       queryClient.invalidateQueries({ queryKey: ['stockHoldings'] });
       queryClient.invalidateQueries({ queryKey: ['aggregatedStock'] });
       queryClient.invalidateQueries({ queryKey: ['prepTasks'] }); // Invalidate task history if needed
   }


  const rows = data.map((recipe) => {
    return (
      <Table.Tr key={recipe.id}>
         <Table.Td>
             <Text fw={500}>{recipe.name}</Text>
             <Text size="xs" c="dimmed">{recipe.notes || ''}</Text>
        </Table.Td>
        <Table.Td>
            <Stack gap={2}>
                 {recipe.inputs.map(input => (
                    <Group key={input.id} gap={4} wrap="nowrap">
                         <IconInputAi size={14} opacity={0.7}/>
                         <Text size="xs">
                             {parseFloat(input.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {input.ingredient.unit}
                         </Text>
                          <Text size="xs" c="dimmed">({input.ingredient.name})</Text>
                    </Group>
                 ))}
             </Stack>
        </Table.Td>
        <Table.Td>
             <Group gap={4} wrap="nowrap">
                <IconOutlet size={14} opacity={0.7}/>
                 <Text size="sm" fw={500}>
                      {parseFloat(recipe.outputQuantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {recipe.outputIngredient.unit}
                 </Text>
                 <Text size="sm">({recipe.outputIngredient.name})</Text>
             </Group>
        </Table.Td>
         <Table.Td>{recipe.estimatedLaborTime ? `${recipe.estimatedLaborTime} min` : 'N/A'}</Table.Td>

        <Table.Td>
          <Group gap="xs" wrap="nowrap">
            {/* Execute Button */}
            <Tooltip label="Executar Preparo">
                <ActionIcon
                    variant="light"
                    color="green"
                    onClick={() => handleOpenExecuteModal(recipe)}
                    disabled={isLoadingLocations || !locations || locations.length === 0}
                >
                    <IconPlayerPlay size={18} />
                </ActionIcon>
            </Tooltip>
            {/* Edit Button */}
            <Tooltip label="Editar Receita">
              <ActionIcon variant="light" color="blue" onClick={() => onEdit(recipe)}>
                <IconPencil size={18} />
              </ActionIcon>
            </Tooltip>
            {/* Delete Button */}
            <Tooltip label="Excluir Receita">
              <ActionIcon
                variant="light"
                color="red"
                onClick={() => handleDeleteClick(recipe)}
                loading={deletePrepRecipe.isPending && deletePrepRecipe.variables === recipe.id}
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  // Use combined loading state
  const showLoader = isLoading || isLoadingLocations;

  return (
    <>
      <ExecutePrepTaskModal
          opened={isExecuteModalOpen}
          onClose={handleCloseExecuteModal}
          onSuccess={handleExecuteSuccess}
          prepRecipe={recipeToExecute}
          locations={locations ?? []} // Pass fetched locations
      />

      <Table.ScrollContainer minWidth={800}>
         <Table verticalSpacing="sm" striped highlightOnHover>
            <Table.Thead>
            <Table.Tr>
                <Table.Th>Nome / Notas</Table.Th>
                <Table.Th>Ingredientes Entrada</Table.Th>
                <Table.Th>Ingrediente Saída (Rendimento)</Table.Th>
                <Table.Th>Tempo Estimado</Table.Th>
                <Table.Th>Ações</Table.Th>
            </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
            {showLoader ? (
                <Table.Tr><Table.Td colSpan={5}><Center h={200}><Loader /></Center></Table.Td></Table.Tr>
            ) : rows.length > 0 ? (
                rows
            ) : (
                <Table.Tr>
                <Table.Td colSpan={5}>
                    <Text ta="center" c="dimmed" my="md">Nenhuma receita de preparo definida.</Text>
                </Table.Td>
                </Table.Tr>
            )}
            </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </>
  );
}