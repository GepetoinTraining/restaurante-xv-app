// PATH: app/dashboard/products/components/ManageRecipeModal.tsx
// NOTE: This is a NEW FILE.

"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  TextInput,
  Button,
  Stack,
  LoadingOverlay,
  Select,
  NumberInput,
  Textarea,
  Group,
  ActionIcon,
  Text,
  Title,
  Loader,
  Alert,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { randomId } from "@mantine/hooks"; // Import randomId from @mantine/hooks
import { ApiResponse } from "@/lib/types";
import { ProductWithWorkstation } from "../page";
// ---- START FIX 1 ----
// Correct the import path and alias the type if needed
import { SerializedIngredientDef as SerializedIngredient } from "../../ingredients/page";
// ---- END FIX 1 ----
import { IconTrash } from "@tabler/icons-react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Define types for the form
interface RecipeStepItem {
  key: string;
  stepNumber: number;
  instruction: string;
}
interface RecipeIngredientItem {
  key: string;
  ingredientId: string | null;
  quantity: string;
}
// Full recipe type returned from GET /api/recipes
type FullRecipe = any;

// Wrapper to provide QueryClient
export function ManageRecipeModal(props: {
  opened: boolean;
  onClose: () => void;
  product: ProductWithWorkstation | null;
}) {
  // Check if a QueryClientProvider is already higher up the tree if necessary
  // For simplicity, wrapping here ensures it has one.
  // Consider providing the client via context if used in many places.
  return (
    <QueryClientProvider client={new QueryClient()}>
      <RecipeModalContent {...props} />
    </QueryClientProvider>
  );
}

// Main Modal Content
function RecipeModalContent({
  opened,
  onClose,
  product,
}: {
  opened: boolean;
  onClose: () => void;
  product: ProductWithWorkstation | null;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ingredientsList, setIngredientsList] = useState<SerializedIngredient[]>([]);
  const [isFetchingIngredients, setIsFetchingIngredients] = useState(true);

  // Form setup
  const form = useForm({
    initialValues: {
      notes: "",
      difficulty: 1,
      ingredients: [] as RecipeIngredientItem[],
      steps: [] as RecipeStepItem[],
    },
    validate: {
      ingredients: {
        ingredientId: (value) => (value ? null : "Ingrediente é obrigatório"),
        // Ensure quantity is validated correctly as a number > 0
        quantity: (value) => {
             const num = parseFloat(value);
             return !isNaN(num) && num > 0 ? null : "Qtd. inválida";
        },
      },
      steps: {
        instruction: (value) => (value && value.trim().length > 0 ? null : "Instrução é obrigatória"),
      },
    },
  });

  // Fetch all available ingredients for the dropdown
  useEffect(() => {
    const fetchIngredients = async () => {
      if (!opened) return; // Only fetch if modal is opened
      setIsFetchingIngredients(true);
      try {
        const response = await fetch("/api/ingredients"); // Correct API endpoint
        const data: ApiResponse<SerializedIngredient[]> = await response.json();
        if (data.success && data.data) {
          setIngredientsList(data.data);
        } else {
           notifications.show({title: "Erro", message: data.error || "Falha ao buscar ingredientes", color: "red"});
        }
      } catch (error) {
        console.error("Failed to fetch ingredients", error);
        notifications.show({title: "Erro", message: "Falha ao buscar ingredientes.", color: "red"});
      } finally {
        setIsFetchingIngredients(false);
      }
    };
    fetchIngredients();
  }, [opened]); // Dependency array includes opened

  // Fetch existing recipe data when modal opens or product changes
  const {
    data: existingRecipe,
    isLoading: isLoadingRecipe,
    error: recipeError,
    // refetch, // refetch might be useful if needed later
  } = useQuery<FullRecipe | null>({ // Allow null if no recipe exists
    queryKey: ["recipe", product?.id],
    queryFn: async () => {
       if (!product?.id) return null; // Don't fetch if no product ID
      const response = await fetch(`/api/recipes?productId=${product.id}`);
      if (response.status === 404) {
          return null; // Handle case where no recipe exists yet
      }
      const data: ApiResponse<FullRecipe> = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
      throw new Error(data.error || "Failed to fetch recipe");
    },
    enabled: !!product && opened, // Only run query if product exists and modal is open
    retry: false, // Don't retry automatically on 404 etc.
  });

  // Populate form with existing recipe data
  useEffect(() => {
    if (opened && product) { // Only set values when opened and product is available
        if (existingRecipe) {
          form.setValues({
            notes: existingRecipe.notes || "",
            difficulty: existingRecipe.difficulty || 1,
            ingredients: existingRecipe.ingredients.map((ing: any) => ({
              key: randomId(),
              ingredientId: ing.ingredientId,
              quantity: ing.quantity.toString(), // Ensure quantity is string for form
            })),
            steps: existingRecipe.steps.map((step: any) => ({
              key: randomId(),
              stepNumber: step.stepNumber,
              instruction: step.instruction,
            })),
          });
        } else if (!isLoadingRecipe) { // Only reset if not loading and no recipe found
          form.reset(); // Reset if no recipe exists for the product
        }
    } else if (!opened) {
        form.reset(); // Reset when modal closes
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingRecipe, opened, product, isLoadingRecipe]); // Add dependencies

  // Handle form submission
  const handleSubmit = async (values: typeof form.values) => {
    if (!product) return;
    setIsSubmitting(true);

    // Ensure step numbers are sequential and correct before sending
    const finalSteps = values.steps.map((step, index) => ({
        stepNumber: index + 1, // Re-assign step numbers based on array order
        instruction: step.instruction,
    }));

    // Ensure ingredient quantities are valid numbers before sending (API expects string/number)
    const finalIngredients = values.ingredients.map(ing => ({
        ingredientId: ing.ingredientId,
        quantity: ing.quantity // API should handle string parsing
    }));


    try {
      const response = await fetch("/api/recipes", {
        method: "POST", // API route handles upsert logic via POST
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          notes: values.notes,
          difficulty: values.difficulty,
          ingredients: finalIngredients,
          steps: finalSteps,
        }),
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.success) {
        notifications.show({
          title: "Sucesso",
          message: "Receita salva com sucesso!",
          color: "green",
        });
        handleClose(); // Close modal on success
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao salvar receita",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
       notifications.show({ title: "Erro", message: "Ocorreu um erro inesperado.", color: "red" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // form.reset(); // Reset is handled by useEffect on 'opened' change
    onClose();
  };

  // --- Form Fields for Ingredients ---
  const ingredientOptions = ingredientsList.map((ing) => ({
    value: ing.id,
    label: `${ing.name} (${ing.unit})`,
  }));

  const ingredientFields = form.values.ingredients.map((item, index) => (
    <Group key={item.key} grow align="flex-start">
      <Select
        label="Ingrediente"
        placeholder={isFetchingIngredients ? "Carregando..." : "Selecione..."}
        data={ingredientOptions}
        {...form.getInputProps(`ingredients.${index}.ingredientId`)}
        searchable
        required
        disabled={isFetchingIngredients}
      />
      <NumberInput
        label={`Quantidade (${ingredientsList.find(i=>i.id===item.ingredientId)?.unit || 'Unidade'})`}
        placeholder="1.5"
        decimalScale={3}
        min={0.001}
        step={0.1} // Adjust step as needed
        {...form.getInputProps(`ingredients.${index}.quantity`)}
        required
      />
      <ActionIcon
        color="red"
        onClick={() => form.removeListItem("ingredients", index)}
        mt={25}
        variant="light"
      >
        <IconTrash size={18} />
      </ActionIcon>
    </Group>
  ));

  // --- Form Fields for Steps ---
  const stepFields = form.values.steps.map((item, index) => (
    <Group key={item.key} grow align="flex-start" wrap="nowrap">
      <Text fw={700} mt={30}>{index + 1}.</Text>
      <TextInput
        // Remove label as number indicates step
        // label="Instrução"
        placeholder="Ex: Misture os ingredientes"
        {...form.getInputProps(`steps.${index}.instruction`)}
        required
        style={{ flexGrow: 1 }}
      />
      <ActionIcon
        color="red"
        onClick={() => form.removeListItem("steps", index)}
        mt={25} // Align with input label visually
         variant="light"
      >
        <IconTrash size={18} />
      </ActionIcon>
    </Group>
  ));

  const isLoading = isSubmitting || isFetchingIngredients || (isLoadingRecipe && !existingRecipe); // Show loading overlay initially

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={`Receita: ${product?.name || ""}`}
      size="xl"
    >
      <LoadingOverlay visible={isLoading} />
      {!product ? (
        <Text>Nenhum produto selecionado.</Text>
      ) : (
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            {recipeError && !isLoadingRecipe && ( // Show error only if loading finished with error
              <Alert color="red" title="Erro ao carregar receita">
                {(recipeError as Error).message}. Pode não haver uma receita definida ainda.
              </Alert>
            )}

            {/* Ingredients Section */}
            <Title order={4} mt="md">Ingredientes</Title>
            {ingredientFields.length > 0 ? (
              ingredientFields
            ) : (
              <Text c="dimmed" size="sm">Nenhum ingrediente adicionado.</Text>
            )}
            <Button
              variant="outline"
               // ---- START FIX 2 ----
              onClick={() =>
                form.insertListItem("ingredients", { // Correct method
                  key: randomId(),
                  ingredientId: null,
                  quantity: "1",
                }, form.values.ingredients.length) // Add index
              }
               // ---- END FIX 2 ----
              disabled={isFetchingIngredients}
              size="xs"
            >
              Adicionar Ingrediente
            </Button>

            {/* Steps Section */}
            <Title order={4} mt="lg">Modo de Preparo</Title>
            {stepFields.length > 0 ? (
              stepFields
            ) : (
              <Text c="dimmed" size="sm">Nenhum passo adicionado.</Text>
            )}
            <Button
              variant="outline"
              // ---- START FIX 3 ----
              onClick={() =>
                 form.insertListItem("steps", { // Correct method
                  key: randomId(),
                  stepNumber: form.values.steps.length + 1, // Temp number, will be reassigned
                  instruction: "",
                }, form.values.steps.length) // Add index
              }
              // ---- END FIX 3 ----
              size="xs"
            >
              Adicionar Passo
            </Button>

            {/* Other Fields */}
            <Title order={4} mt="lg">Detalhes Adicionais</Title>
            <Textarea
              label="Notas (Opcional)"
              placeholder="Ex: Servir com gelo"
              {...form.getInputProps('notes')}
              minRows={2}
            />
            <NumberInput
                label="Dificuldade (1-5, Opcional)"
                min={1}
                max={5}
                step={1}
                allowDecimal={false}
                {...form.getInputProps('difficulty')}
            />

            <Button type="submit" mt="xl" loading={isSubmitting} disabled={isFetchingIngredients || isLoadingRecipe}>
              Salvar Receita
            </Button>
          </Stack>
        </form>
      )}
    </Modal>
  );
}