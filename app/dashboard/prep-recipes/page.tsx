
"use client";

import { useState } from "react";
import { Button, Container, Stack, Group, Text } from "@mantine/core";
import { IconPlus, IconToolsKitchen3 } from "@tabler/icons-react"; // Using IconToolsKitchen3 for prep
import { PageHeader } from "../components/PageHeader";
import { ApiResponse, SerializedIngredientDef, SerializedPrepRecipe } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { PrepRecipeTable } from "./components/PrepRecipeTable"; // New table component
import { ManagePrepRecipeModal } from "./components/ManagePrepRecipeModal"; // New modal component

// Wrapper for React Query
export default function PrepRecipesPageWrapper() {
    return (
        <QueryClientProvider client={new QueryClient()}>
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
          return result.data!;
      },
  });

   // Fetch Ingredients (needed for the modal's dropdowns)
   const {
      data: ingredients,
      isLoading: isLoadingIngredients,
      isError: isIngredientsError,
      error: ingredientsError,
  } = useQuery<SerializedIngredientDef[]>({
      queryKey: ['ingredientDefinitions'], // Use the same key as other pages if desired
      queryFn: async () => {
          const res = await fetch("/api/ingredients");
          const result: ApiResponse<SerializedIngredientDef[]> = await res.json();
          if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar ingredientes");
          return result.data!;
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
  const error = prepRecipesError || ingredientsError;


  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Receitas de Preparo" />
        <Group>
          <Button
            leftSection={<IconPlus size={14} />}
            onClick={handleOpenCreateModal}
            disabled={isLoading || !ingredients || ingredients.length === 0} // Disable if loading or no ingredients fetched
          >
            Nova Receita de Preparo
          </Button>
        </Group>

        {isError && <Text c="red">Erro ao carregar dados: {(error as Error)?.message}</Text>}

        <PrepRecipeTable
          data={prepRecipes ?? []}
          isLoading={isLoadingPrepRecipes}
          onEdit={handleOpenEditModal}
          onRefresh={refetchPrepRecipes}
        />
      </Stack>

      <ManagePrepRecipeModal
        opened={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        ingredients={ingredients ?? []} // Pass fetched ingredients
        prepRecipeToEdit={prepRecipeToEdit}
      />

    </Container>
  );
}