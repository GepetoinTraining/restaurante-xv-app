"use client";

import {
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  Text,
  Loader,
  Group,
  Stack,
  Button // Added Button
} from "@mantine/core";
import { IconPencil, IconTrash, IconInputAi, IconOutlet, IconPlayerPlay } from "@tabler/icons-react"; // Added IconPlayerPlay
import { SerializedPrepRecipe, ApiResponse } from "@/lib/types";
import { notifications } from '@mantine/notifications';
// ---- START FIX ----
// Add useMutation typing helpers
import { useMutation, useQueryClient, UseMutateFunction } from '@tanstack/react-query';
// ---- END FIX ----
import { useState } from 'react'; // Added useState
import { ExecutePrepTaskModal } from './ExecutePrepTaskModal'; // Import the new modal
import { useQuery } from "@tanstack/react-query"; // Import useQuery
import { VenueObject } from '@prisma/client'; // Import VenueObject

// Type for VenueObject used as location
type StockLocation = Pick<VenueObject, 'id' | 'name'>;


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

  // Fetch Stock Locations for the modal
  const { data: locations, isLoading: isLoadingLocations } = useQuery<StockLocation[]>({
      queryKey: ['stockLocations'],
      queryFn: async () => {
          const res = await fetch("/api/venue-objects"); // Needs filtering or dedicated endpoint
          const result: ApiResponse<VenueObject[]> = await res.json();
          if (result.success && result.data) {
              const storageTypes: VenueObject['type'][] = ['STORAGE', 'FREEZER', 'SHELF', 'WORKSTATION_STORAGE'];
              // Serialize decimals for consistency if needed, though only id/name used here
              return result.data
                  .filter(vo => storageTypes.includes(vo.type))
                  .map(vo => ({ id: vo.id, name: vo.name }));
          }
          throw new Error(result.error || "Falha ao buscar locais de estoque");
      },
      staleTime: 5 * 60 * 1000, // Cache locations for 5 mins
  });


  // --- START FIX: Explicitly type useMutation ---
  const deletePrepRecipe = useMutation<
    ApiResponse<{ id: string }>, // TData: Type returned by mutationFn on success
    Error,                     // TError: Type returned on error
    string                     // TVariables: Type passed to mutateFn (the recipe ID)
  >({
    mutationFn: (id: string) => // The argument 'id' is a string
      fetch(`/api/prep-recipes/${id}`, { method: "DELETE" })
      .then(res => {
          if (!res.ok) {
              // Attempt to parse error from API response
              return res.json().then(errData => {
                  throw new Error(errData.error || `HTTP error! status: ${res.status}`);
              }).catch(() => {
                  // Fallback if parsing fails
                  throw new Error(`HTTP error! status: ${res.status}`);
              });
          }
          return res.json()
      }),
    onSuccess: (data, variables /* variables is string */) => {
        if (data.success) {
            notifications.show({
                title: 'Sucesso',
                message: `Receita excluída.`,
                color: 'green',
            });
            // Invalidate queries to refetch data
            queryClient.invalidateQueries({ queryKey: ['prepRecipes'] });
        } else {
             notifications.show({ title: 'Erro', message: data.error || 'Falha ao excluir', color: 'red' });
        }
    },
    onError: (error: Error, variables /* variables is string */) => {
         notifications.show({ title: 'Erro ao Excluir', message: error.message, color: 'red' });
    }
  });
  // --- END FIX ---

  const handleDeleteClick = (recipe: SerializedPrepRecipe) => {
      if (confirm(`Tem certeza que deseja excluir a receita "${recipe.name}"? Esta ação não pode ser desfeita e só funcionará se a receita não estiver em uso.`)) {
          deletePrepRecipe.mutate(recipe.id); // Pass the string ID here
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
       // Invalidate stock-related queries after successful execution
       queryClient.invalidateQueries({ queryKey: ['stockHoldings'] });
       queryClient.invalidateQueries({ queryKey: ['aggregatedStock'] });
       // onRefresh(); // invalidateQueries above should handle this
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
                             {/* Input quantity is already a string from API */}
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
                      {/* Output quantity is already a string from API */}
                      {parseFloat(recipe.outputQuantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {recipe.outputIngredient.unit}
                 </Text>
                 <Text size="sm">({recipe.outputIngredient.name})</Text>
             </Group>
        </Table.Td>
         <Table.Td>{recipe.estimatedLaborTime ? `${recipe.estimatedLaborTime} min` : 'N/A'}</Table.Td>

        <Table.Td>
          <Group gap="xs" wrap="nowrap">
            {/* --- Execute Button --- */}
            <Tooltip label="Executar Preparo">
                <ActionIcon
                    variant="light"
                    color="green"
                    onClick={() => handleOpenExecuteModal(recipe)}
                    disabled={isLoadingLocations || !locations || locations.length === 0} // Disable if locations not ready
                >
                    <IconPlayerPlay size={18} />
                </ActionIcon>
            </Tooltip>
            {/* --- Edit Button --- */}
            <Tooltip label="Editar Receita">
              <ActionIcon variant="light" color="blue" onClick={() => onEdit(recipe)}>
                <IconPencil size={18} />
              </ActionIcon>
            </Tooltip>
            {/* --- Delete Button --- */}
            <Tooltip label="Excluir Receita">
              {/* This is line 137 (approx) where the error occurred */}
              <ActionIcon
                variant="light"
                color="red"
                onClick={() => handleDeleteClick(recipe)}
                // Comparison should now work correctly due to explicit typing
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

  if (isLoading || isLoadingLocations) { // Check both loading states
    return <Loader />;
  }

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
            {rows.length > 0 ? (
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