// PATH: app/dashboard/floorplan/components/CreateFloorPlanModal.tsx
// NOTE: This is a NEW FILE.

"use client";

import { useState } from "react";
import {
  Modal,
  TextInput,
  Button,
  NumberInput,
  Stack,
  LoadingOverlay,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { ApiResponse } from "@/lib/types";
import { FloorPlan } from "@prisma/client";

interface CreateFloorPlanModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: (newPlan: FloorPlan) => void;
}

export function CreateFloorPlanModal({
  opened,
  onClose,
  onSuccess,
}: CreateFloorPlanModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      name: "",
      width: 100,
      height: 100,
    },
    validate: {
      name: (value) =>
        value.trim().length < 2 ? "Nome é obrigatório" : null,
      width: (value) => (value <= 0 ? "Largura deve ser positiva" : null),
      height: (value) => (value <= 0 ? "Altura deve ser positiva" : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/floorplans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data: ApiResponse<FloorPlan> = await response.json();

      if (response.ok && data.success && data.data) {
        notifications.show({
          title: "Sucesso",
          message: "Planta baixa criada com sucesso!",
          color: "green",
        });
        form.reset();
        onSuccess(data.data);
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao criar planta",
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
    <Modal opened={opened} onClose={handleClose} title="Nova Planta Baixa">
      <LoadingOverlay visible={isSubmitting} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            required
            label="Nome da Planta"
            placeholder="Ex: Térreo, Rooftop"
            {...form.getInputProps("name")}
          />
          <NumberInput
            required
            label="Largura (unidades)"
            min={10}
            {...form.getInputProps("width")}
          />
          <NumberInput
            required
            label="Altura (unidades)"
            min={10}
            {...form.getInputProps("height")}
          />
          <Button type="submit" mt="md">
            Salvar
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}