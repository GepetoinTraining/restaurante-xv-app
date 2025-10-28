// PATH: app/dashboard/prep-recipes/page.tsx
"use client";

import { useState } from "react";
import { Button, Container, Stack, Group, Text, Alert } from "@mantine/core";
import { IconPlus, IconAlertCircle } from "@tabler/icons-react";
import { PageHeader } from "../components/PageHeader";
import { ApiResponse, SerializedIngredientDef, SerializedPrepRecipe } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { PrepRecipeTable } from "./components/PrepRecipeTable";
import { ManagePrepRecipeModal } from "./components/ManagePrepRecipeModal";

// Create a client
const queryClient = new QueryClient();

// Wrapper for React Query
export default function PrepRecipesPageWrapper() {
    return (
        <QueryClientProvider client={queryClient}>
            <PrepRecipesPage/>
        </QueryClientProvider>
    );
}

// Main page component
function PrepRecipesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prepRecipeToEdit, setPrepRecipeToEdit] = useState<SerializedPrepRecipe | null>(null);

  // Fetch Prep Recipes
  const {
      data: prepRecipes,
      isLoading: isLoadingPrepRecipes,
      refetch: refetchPrepRecipes,
      isError: isPrepRecipesError,
      error: prepRecipesError,
  } = useQuery<SerializedPrepRecipe[]>({
      queryKey: ['prepRecipes'],
      queryFn: async () => {
          const res = await fetch("/api/prep-recipes");
          const result: ApiResponse<SerializedPrepRecipe[]> = await res.json();
          if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar receitas de preparo");
          return result.data ?? []; // Ensure data is always an array
      },
  });

   // Fetch Ingredients (needed for the modal's dropdowns)
   const {
      data: ingredients,
      isLoading: isLoadingIngredients,
      isError: isIngredientsError,
      error: ingredientsError,
  } = useQuery<SerializedIngredientDef[]>({
      queryKey: ['ingredientDefinitions'], // Use consistent key
      queryFn: async () => {
          const res = await fetch("/api/ingredients");
          const result: ApiResponse<SerializedIngredientDef[]> = await res.json();
          if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar ingredientes");
          return result.data ?? []; // Ensure data is always an array
      }
  });


  const handleOpenCreateModal = () => {
    setPrepRecipeToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prepRecipe: SerializedPrepRecipe) => {
    setPrepRecipeToEdit(prepRecipe);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setPrepRecipeToEdit(null);
    setIsModalOpen(false);
  }

  const handleSuccess = () => {
    handleCloseModal();
    refetchPrepRecipes(); // Refresh the table
  }

  // Combine loading states
  const isLoading = isLoadingPrepRecipes || isLoadingIngredients;
  const isError = isPrepRecipesError || isIngredientsError;
  const combinedError = prepRecipesError || ingredientsError;

  // Determine if create button should be disabled
  const disableCreate = isLoading || isError || !ingredients || ingredients.length === 0 || !ingredients.some(ing => ing.isPrepared);

  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Receitas de Preparo" />
        <Group>
          <Button
            leftSection={<IconPlus size={14} />}
            onClick={handleOpenCreateModal}
            disabled={disableCreate}
          >
            Nova Receita de Preparo
          </Button>
        </Group>

        {/* Error handling messages */}
        {isError && (
            <Alert title="Erro ao Carregar Dados" color="red" icon={<IconAlertCircle />}>
                Não foi possível carregar as receitas ou ingredientes: {(combinedError as Error)?.message}
            </Alert>
        )}
        {!isLoading && !isError && ingredients && ingredients.length === 0 && (
             <Alert title="Atenção" color="orange" icon={<IconAlertCircle />}>
                Nenhum ingrediente definido no sistema. Adicione ingredientes primeiro na tela de Ingredientes.
            </Alert>
        )}
        {!isLoading && !isError && ingredients && ingredients.length > 0 && !ingredients.some(ing => ing.isPrepared) && (
             <Alert title="Atenção" color="yellow" icon={<IconAlertCircle />}>
                Para criar uma receita de preparo, ao menos um ingrediente deve ser marcado como "Preparado" na tela de Ingredientes.
            </Alert>
        )}


        <PrepRecipeTable
          data={prepRecipes ?? []}
          isLoading={isLoadingPrepRecipes} // Table loading depends only on recipes
          onEdit={handleOpenEditModal}
          onRefresh={refetchPrepRecipes}
        />
      </Stack>

      {/* Render modal only if ingredients are loaded to prevent errors */}
      {!isLoadingIngredients && (
        <ManagePrepRecipeModal
            opened={isModalOpen}
            onClose={handleCloseModal}
            onSuccess={handleSuccess}
            ingredients={ingredients ?? []} // Pass fetched ingredients
            prepRecipeToEdit={prepRecipeToEdit}
        />
      )}

    </Container>
  );
}