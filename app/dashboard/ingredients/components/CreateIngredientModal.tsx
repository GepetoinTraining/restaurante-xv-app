// PATH: app/dashboard/ingredients/components/CreateIngredientModal.tsx
"use client";

import { useState } from "react";
import {
  Modal,
  TextInput,
  Button,
  NumberInput,
  Stack,
  LoadingOverlay,
  Switch, // Import Switch
  Group, // Import Group
  Text, // Import Text
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { ApiResponse } from "@/lib/types";

interface CreateIngredientModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // TODO: Add ingredientToEdit prop later for PATCH functionality
}

export function CreateIngredientModal({
  opened,
  onClose,
  onSuccess,
}: CreateIngredientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const isEditMode = false; // TODO: Set based on ingredientToEdit prop

  const form = useForm({
    initialValues: {
      name: "",
      unit: "",
      costPerUnit: 0,
      isPrepared: false, // Add isPrepared flag
    },
    validate: {
      name: (value) =>
        value.trim().length < 2 ? "Nome deve ter pelo menos 2 caracteres" : null,
      unit: (value) => (value.trim().length > 0 ? null : "Unidade é obrigatória"),
      costPerUnit: (value, values) =>
        // Allow cost to be zero for prepared items, as it will be calculated
        !values.isPrepared && value <= 0 ? "Custo deve ser maior que zero para itens comprados" : null,
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);
    try {
      // TODO: Add PATCH logic using /api/ingredients/[id] if isEditMode

      // POST logic remains largely the same, just add isPrepared
      const response = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          unit: values.unit,
          // Send cost as string, handle 0 cost for prepared
          costPerUnit: values.isPrepared ? "0" : values.costPerUnit.toString(),
          isPrepared: values.isPrepared, // Send the flag
        }),
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.success) {
        notifications.show({
          title: "Sucesso",
          message: "Definição de ingrediente criada!",
          color: "green",
        });
        form.reset();
        onSuccess();
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao criar ingrediente",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
      notifications.show({
        title: "Erro",
        message: "Ocorreu um erro inesperado",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Novo Ingrediente (Definição)">
      <LoadingOverlay visible={isSubmitting} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            required
            label="Nome do Ingrediente"
            placeholder="Ex: Cebola Pera, Cebola Picada, Vodka Absolut"
            {...form.getInputProps("name")}
          />
           <Switch
                mt="md"
                label="Este é um item preparado?"
                description="Marque se este item é produzido internamente (ex: Cebola Picada) a partir de outros ingredientes."
                {...form.getInputProps('isPrepared', { type: 'checkbox' })}
            />
          <Group grow>
            <TextInput
                required
                label="Unidade Base de Medida"
                placeholder="Ex: 'g', 'ml', 'unidade'"
                description="A menor unidade usada em receitas."
                {...form.getInputProps("unit")}
            />
             <NumberInput
                // Required only if NOT prepared
                required={!form.values.isPrepared}
                label="Custo por Unidade Base (R$)"
                placeholder={form.values.isPrepared ? "Calculado" : "0.15"}
                description={form.values.isPrepared ? `Será calculado pelas Receitas de Preparo` : `Custo de compra por ${form.values.unit || 'UN'}`}
                decimalScale={4}
                min={0} // Allow 0 for prepared, validation prevents <=0 for raw
                disabled={form.values.isPrepared} // Disable if prepared
                {...form.getInputProps("costPerUnit")}
            />
          </Group>

          <Button type="submit" mt="md">
            Salvar Definição
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}