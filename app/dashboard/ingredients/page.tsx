// PATH: app/dashboard/ingredients/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button, Container, Stack, Group } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
// Import Ingredient type directly from Prisma client as it only holds definition
import { Ingredient } from "@prisma/client";
import { PageHeader } from "../components/PageHeader";
import { IngredientTable } from "./components/IngredientTable"; // Updated path
import { CreateIngredientModal } from "./components/CreateIngredientModal"; // Updated path
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";
// ---- START FIX ----
// Import QueryClient and Provider
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client (can be outside the component)
const queryClient = new QueryClient();
// ---- END FIX ----

// Type from API (cost is string)
export type SerializedIngredientDef = Omit<Ingredient, "costPerUnit"> & {
  costPerUnit: string;
};


// ---- START FIX ----
// Create a Wrapper Component
export default function IngredientsPageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <IngredientsPage />
    </QueryClientProvider>
  );
}

// Rename the original component
function IngredientsPage() {
// ---- END FIX ----
  const [ingredients, setIngredients] = useState<SerializedIngredientDef[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIngredients = async () => {
    setIsLoading(true);
    try {
      // Fetch definitions from the refactored ingredients route
      const response = await fetch("/api/ingredients");
      const data: ApiResponse<SerializedIngredientDef[]> = await response.json();
      if (data.success && data.data) {
        setIngredients(data.data);
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao carregar definições de ingredientes",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Fetch ingredients error:", error);
      notifications.show({
        title: "Erro",
        message: "Falha ao carregar definições de ingredientes",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  // UpdateStockModal is removed, no handler needed

  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Ingredientes (Definições)" />
        <Group>
          <Button
            leftSection={<IconPlus size={14} />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Novo Ingrediente
          </Button>
        </Group>
        <IngredientTable
          data={ingredients}
          isLoading={isLoading}
          onRefresh={fetchIngredients}
          // Remove onUpdateStock prop
          // onUpdateStock={handleOpenUpdateStock} // REMOVED
        />
      </Stack>

      <CreateIngredientModal
        opened={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          fetchIngredients();
        }}
      />

      {/* UpdateStockModal component removed */}
    </Container>
  );
} // Close the renamed IngredientsPage component