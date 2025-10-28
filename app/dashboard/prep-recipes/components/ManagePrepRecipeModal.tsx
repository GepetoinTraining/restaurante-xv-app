// PATH: app/dashboard/prep-recipes/components/ManagePrepRecipeModal.tsx
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
  Alert,
  ScrollArea, // Import ScrollArea
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { randomId } from "@mantine/hooks";
import { ApiResponse, SerializedIngredientDef, SerializedPrepRecipe } from "@/lib/types";
import { IconTrash } from "@tabler/icons-react";

// Define types for the form items
interface PrepIngredientItem {
  key: string;
  ingredientId: string | null;
  quantity: string; // Keep as string for form input
}

interface ManagePrepRecipeModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ingredients: SerializedIngredientDef[]; // All ingredient definitions
  prepRecipeToEdit: SerializedPrepRecipe | null;
}

export function ManagePrepRecipeModal({
  opened,
  onClose,
  onSuccess,
  ingredients,
  prepRecipeToEdit,
}: ManagePrepRecipeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!prepRecipeToEdit;

  // Filter ingredients for dropdowns
  const preparedIngredients = ingredients.filter(ing => ing.isPrepared);
  // Use all ingredients as potential inputs
  const allIngredients = ingredients;

  const form = useForm({
    initialValues: {
      name: "",
      outputIngredientId: null as string | null,
      outputQuantity: "1", // Default as string
      notes: "",
      estimatedLaborTime: '' as number | string | null, // Allow empty string, number, or null
      inputs: [] as PrepIngredientItem[],
    },
    validate: {
      name: (value) => (value.trim().length < 2 ? "Nome é obrigatório (mín 2 chars)" : null),
      outputIngredientId: (value) => (value ? null : "Ingrediente de saída é obrigatório"),
      outputQuantity: (value) => {
          const num = parseFloat(value);
          return !isNaN(num) && num > 0 ? null : "Qtd. de saída inválida (> 0)";
      },
      inputs: {
        ingredientId: (value) => (value ? null : "Obrigatório"),
        quantity: (value) => {
            const num = parseFloat(value);
            return !isNaN(num) && num > 0 ? null : "Qtd. inválida (> 0)";
        },
      },
       estimatedLaborTime: (val) => {
           if (val === null || val === '') return null; // Allow empty or null
           const num = Number(val);
           return isNaN(num) || num < 0 ? "Tempo deve ser número positivo ou vazio" : null;
       },
    },
  });

  // Populate form if editing
  useEffect(() => {
    if (opened) {
      if (isEditMode && prepRecipeToEdit) {
        form.setValues({
          name: prepRecipeToEdit.name,
          outputIngredientId: prepRecipeToEdit.outputIngredient.id,
          outputQuantity: prepRecipeToEdit.outputQuantity, // Already string from API
          notes: prepRecipeToEdit.notes || "",
          estimatedLaborTime: prepRecipeToEdit.estimatedLaborTime ?? '', // Use '' for empty number input
          inputs: prepRecipeToEdit.inputs.map(input => ({
            key: randomId(),
            ingredientId: input.ingredient.id,
            quantity: input.quantity, // Already string from API
          }))
        });
      } else {
        // Reset for create mode when opened
        form.reset();
        // Add one empty input row by default for new recipes
        form.insertListItem("inputs", { key: randomId(), ingredientId: null, quantity: "" });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepRecipeToEdit, opened, isEditMode]); // Rerun when these change

  // Handle form submission
  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);

     if (!values.outputIngredientId) {
        notifications.show({title: "Erro de Validação", message: "Selecione o ingrediente de saída.", color: "red"});
        setIsSubmitting(false); return;
     }
     if (values.inputs.length === 0) {
          notifications.show({title: "Erro de Validação", message: "Adicione pelo menos um ingrediente de entrada.", color: "red"});
          setIsSubmitting(false); return;
     }
     // Extra check for empty input values which validation might miss if untouched
     if (values.inputs.some(inp => !inp.ingredientId || !inp.quantity || parseFloat(inp.quantity) <= 0)) {
         notifications.show({title: "Erro de Validação", message: "Verifique os ingredientes de entrada (seleção e quantidade > 0).", color: "red"});
         setIsSubmitting(false); return;
     }


    // Prepare payload: convert time to number or null, keep quantities as strings
    const payload = {
        ...values,
        estimatedLaborTime: values.estimatedLaborTime === '' ? null : Number(values.estimatedLaborTime),
        inputs: values.inputs.map(({ key, ...rest }) => rest), // Remove 'key' before sending
    };

    const url = isEditMode ? `/api/prep-recipes/${prepRecipeToEdit!.id}` : "/api/prep-recipes";
    const method = isEditMode ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.success) {
        notifications.show({
          title: "Sucesso",
          message: `Receita de preparo "${values.name}" salva!`,
          color: "green",
        });
        onSuccess(); // Close modal and refresh table via parent
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || `Falha ao salvar receita de preparo`,
          color: "red",
        });
      }
    } catch (error: any) {
      console.error("Submit error:", error);
       notifications.show({ title: "Erro Inesperado", message: error.message || "Ocorreu um erro de rede ou servidor.", color: "red" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset(); // Reset form state on close
    onClose();
  };

  // --- Form Fields ---
  const allIngredientOptions = allIngredients.map((ing) => ({
    value: ing.id,
    label: `${ing.name} (${ing.unit}) ${ing.isPrepared ? '[P]' : ''}`,
  }));
   const outputIngredientOptions = preparedIngredients.map((ing) => ({
    value: ing.id,
    label: `${ing.name} (${ing.unit})`,
  }));

  const inputFields = form.values.inputs.map((item, index) => {
      const selectedIngredient = allIngredients.find(i => i.id === item.ingredientId);
      return (
        <Group key={item.key} grow align="flex-start" wrap="nowrap" gap="xs">
          <Select
            // label="Ingrediente Entrada"
            label={index === 0 ? "Ingrediente Entrada" : undefined}
            placeholder="Selecione..."
            data={allIngredientOptions}
            {...form.getInputProps(`inputs.${index}.ingredientId`)}
            searchable
            required
            limit={20} // Improve performance for long lists
            error={form.errors[`inputs.${index}.ingredientId`]}
          />
          <NumberInput
            // label="Qtd. Entrada"
            label={index === 0 ? `Qtd. (${selectedIngredient?.unit || 'UN'})` : undefined}
            placeholder="1.5"
            decimalScale={3}
            min={0.001}
            step={0.1}
            {...form.getInputProps(`inputs.${index}.quantity`)}
            required
            error={form.errors[`inputs.${index}.quantity`]}
          />
          <ActionIcon
            color="red"
            onClick={() => form.removeListItem("inputs", index)}
            mt={index === 0 ? 25 : 0} // Align with input label only for the first row
            variant="light"
            disabled={form.values.inputs.length <= 1} // Prevent removing the last item easily
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      );
  });


  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={isEditMode ? "Editar Receita de Preparo" : "Nova Receita de Preparo"}
      size="xl"
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }} // Mantine v7+ props
    >
      <LoadingOverlay visible={isSubmitting} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
                required
                label="Nome da Receita de Preparo"
                placeholder="Ex: Cebola Picada, Molho Base"
                {...form.getInputProps('name')}
            />

            <Group grow align="flex-start">
                 <Select
                    required
                    label="Ingrediente de Saída (Preparado)"
                    placeholder="Selecione o item resultante..."
                    data={outputIngredientOptions}
                    {...form.getInputProps('outputIngredientId')}
                    searchable
                    limit={20}
                    nothingFoundMessage={preparedIngredients.length === 0 ? "Nenhum item preparado..." : "Nenhum encontrado"}
                 />
                 <NumberInput
                    required
                    label="Quantidade Produzida (Rendimento)"
                    description={`Em ${ingredients.find(i => i.id === form.values.outputIngredientId)?.unit || 'UN'}`}
                    placeholder="0.9"
                    decimalScale={3}
                    min={0.001}
                    step={0.1}
                    {...form.getInputProps('outputQuantity')}
                />
            </Group>
             {!preparedIngredients.length && ingredients.length > 0 && (
                 <Alert color="orange" title="Atenção">
                     Nenhum ingrediente marcado como 'Preparado' encontrado. Vá para a tela de Ingredientes, crie ou edite um item e marque a opção "Este é um item preparado?".
                 </Alert>
             )}
             {ingredients.length === 0 && (
                 <Alert color="red" title="Atenção">
                     Nenhum ingrediente definido no sistema. Vá para a tela de Ingredientes para adicioná-los primeiro.
                 </Alert>
             )}

            {/* Input Ingredients Section */}
            <Title order={5} mt="md">Ingredientes de Entrada</Title>
            <ScrollArea.Autosize mah={250}> {/* Add ScrollArea for many inputs */}
                <Stack gap="xs">
                    {inputFields.length > 0 ? (
                      inputFields
                    ) : (
                      <Text c="dimmed" size="sm" ta="center" p="md">Adicione ingredientes de entrada abaixo.</Text>
                    )}
                </Stack>
             </ScrollArea.Autosize>
            <Button
              variant="outline"
              onClick={() =>
                form.insertListItem("inputs", {
                  key: randomId(),
                  ingredientId: null,
                  quantity: "", // Start empty for better validation feedback
                }, form.values.inputs.length)
              }
              size="xs"
              disabled={ingredients.length === 0} // Disable if no ingredients exist
            >
              + Adicionar Ingrediente de Entrada
            </Button>


            {/* Other Fields */}
            <Title order={5} mt="lg">Detalhes Adicionais</Title>
            <Textarea
              label="Notas / Instruções (Opcional)"
              placeholder="Ex: Cortar em cubos de 5mm, armazenar refrigerado..."
              {...form.getInputProps('notes')}
              minRows={2}
            />
            <NumberInput
                label="Tempo Estimado de Trabalho (Minutos, Opcional)"
                placeholder="15"
                min={0}
                step={1}
                allowDecimal={false}
                {...form.getInputProps('estimatedLaborTime')}
            />

            <Button type="submit" mt="xl" loading={isSubmitting} disabled={ingredients.length === 0 || preparedIngredients.length === 0}>
              {isEditMode ? "Salvar Alterações" : "Criar Receita de Preparo"}
            </Button>
          </Stack>
        </form>
    </Modal>
  );
}