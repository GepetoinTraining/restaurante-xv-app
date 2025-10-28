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
  quantity: string;
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
  const rawIngredients = ingredients.filter(ing => !ing.isPrepared); // Or allow prepared as input? Decision needed. Let's allow all for now.

  const form = useForm({
    initialValues: {
      name: "",
      outputIngredientId: null as string | null,
      outputQuantity: "1",
      notes: "",
      estimatedLaborTime: null as number | null | '', // Allow empty string
      inputs: [] as PrepIngredientItem[],
    },
    validate: {
      name: (value) => (value.trim().length < 2 ? "Nome é obrigatório" : null),
      outputIngredientId: (value) => (value ? null : "Ingrediente de saída é obrigatório"),
      outputQuantity: (value) => (parseFloat(value) > 0 ? null : "Qtd. de saída inválida"),
      inputs: {
        ingredientId: (value) => (value ? null : "Ingrediente é obrigatório"),
        quantity: (value) => (parseFloat(value) > 0 ? null : "Qtd. inválida"),
      },
       estimatedLaborTime: (val) => {
           if (val === null || val === '') return null; // Allow empty
           const num = Number(val);
           return isNaN(num) || num < 0 ? "Tempo deve ser um número positivo ou vazio" : null;
       },
    },
  });

  // Populate form if editing
  useEffect(() => {
    if (isEditMode && prepRecipeToEdit && opened) {
      form.setValues({
        name: prepRecipeToEdit.name,
        outputIngredientId: prepRecipeToEdit.outputIngredient.id,
        outputQuantity: prepRecipeToEdit.outputQuantity,
        notes: prepRecipeToEdit.notes || "",
        estimatedLaborTime: prepRecipeToEdit.estimatedLaborTime ?? '',
        inputs: prepRecipeToEdit.inputs.map(input => ({
          key: randomId(), // Generate new keys for form state
          ingredientId: input.ingredient.id,
          quantity: input.quantity,
        }))
      });
    } else if (!opened) {
      form.reset(); // Reset form when modal closes or opens for creation
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepRecipeToEdit, opened]);

  // Handle form submission
  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);

     if (!values.outputIngredientId) { // Should be caught by validation, but double check
        notifications.show({title: "Erro", message: "Ingrediente de saída não selecionado.", color: "red"});
        setIsSubmitting(false);
        return;
     }
     if (values.inputs.length === 0) {
          notifications.show({title: "Erro", message: "Adicione pelo menos um ingrediente de entrada.", color: "red"});
          setIsSubmitting(false);
          return;
     }

    const payload = {
        ...values,
        estimatedLaborTime: values.estimatedLaborTime === '' ? null : Number(values.estimatedLaborTime),
        // Ensure quantities are strings if API expects strings, or convert here if needed
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

  // --- Form Fields for Inputs ---
  const ingredientOptions = ingredients.map((ing) => ({ // Use all ingredients as potential inputs
    value: ing.id,
    label: `${ing.name} (${ing.unit}) ${ing.isPrepared ? '[P]' : ''}`, // Indicate if prepared
  }));
   const outputIngredientOptions = preparedIngredients.map((ing) => ({
    value: ing.id,
    label: `${ing.name} (${ing.unit})`,
  }));

  const inputFields = form.values.inputs.map((item, index) => (
    <Group key={item.key} grow align="flex-start" wrap="nowrap">
      <Select
        label="Ingrediente Entrada"
        placeholder="Selecione..."
        data={ingredientOptions}
        {...form.getInputProps(`inputs.${index}.ingredientId`)}
        searchable
        required
        // withinPortal removed in previous fix
      />
      <NumberInput
        label="Qtd. Entrada"
        placeholder="1.5"
        decimalScale={3}
        min={0.001}
        {...form.getInputProps(`inputs.${index}.quantity`)}
        required
      />
      <ActionIcon
        color="red"
        onClick={() => form.removeListItem("inputs", index)} // Corrected method
        mt={25} // Align with input label
        variant="light"
      >
        <IconTrash size={18} />
      </ActionIcon>
    </Group>
  ));


  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={isEditMode ? "Editar Receita de Preparo" : "Nova Receita de Preparo"}
      size="xl"
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
                    // ---- START FIX ----
                    // withinPortal // Removed this line
                    // ---- END FIX ----
                 />
                 <NumberInput
                    required
                    label="Quantidade Produzida (Rendimento)"
                    description={`Em ${ingredients.find(i => i.id === form.values.outputIngredientId)?.unit || 'UN'}`}
                    placeholder="0.9"
                    decimalScale={3}
                    min={0.001}
                    {...form.getInputProps('outputQuantity')}
                />
            </Group>
             {!preparedIngredients.length && (
                 <Alert color="orange" title="Atenção">Nenhum ingrediente marcado como 'Preparado' encontrado. Defina um ingrediente como preparado na tela de Ingredientes antes de criar uma receita para ele.</Alert>
             )}

            {/* Input Ingredients Section */}
            <Title order={5} mt="md">Ingredientes de Entrada</Title>
            {inputFields.length > 0 ? (
              inputFields
            ) : (
              <Text c="dimmed" size="sm">Nenhum ingrediente de entrada adicionado.</Text>
            )}
            <Button
              variant="outline"
              onClick={() =>
                form.insertListItem("inputs", { // Corrected method
                  key: randomId(),
                  ingredientId: null,
                  quantity: "1",
                }, form.values.inputs.length) // Added index
              }
              size="xs"
            >
              Adicionar Ingrediente de Entrada
            </Button>


            {/* Other Fields */}
            <Title order={5} mt="lg">Detalhes Adicionais</Title>
            <Textarea
              label="Notas / Instruções (Opcional)"
              placeholder="Ex: Cortar em cubos de 5mm"
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

            <Button type="submit" mt="xl" loading={isSubmitting} disabled={!preparedIngredients.length}>
              {isEditMode ? "Salvar Alterações" : "Criar Receita de Preparo"}
            </Button>
          </Stack>
        </form>
    </Modal>
  );
}