// PATH: app/dashboard/vinyl/components/CreateSlotModal.tsx
"use client";

import { useState } from "react";
import {
  Modal,
  Button,
  NumberInput,
  Stack,
  LoadingOverlay,
  Group,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { ApiResponse } from "@/lib/types";

interface CreateSlotModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateSlotModal({
  opened,
  onClose,
  onSuccess,
}: CreateSlotModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      row: 1,
      column: 1,
      capacity: 30,
    },
    validate: {
      row: (value) => (value > 0 ? null : "Linha deve ser 1 ou maior"),
      column: (value) => (value > 0 ? null : "Coluna deve ser 1 ou maior"),
      capacity: (value) => (value > 0 ? null : "Capacidade deve ser positiva"),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/vinyl-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.success) {
        notifications.show({
          title: "Sucesso",
          message: "Slot criado com sucesso!",
          color: "green",
        });
        form.reset();
        onSuccess();
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao criar slot",
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
    <Modal opened={opened} onClose={handleClose} title="Novo Slot (Prateleira)">
      <LoadingOverlay visible={isSubmitting} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Group grow>
            <NumberInput
              required
              label="Linha"
              placeholder="1"
              min={1}
              allowDecimal={false}
              {...form.getInputProps("row")}
            />
            <NumberInput
              required
              label="Coluna"
              placeholder="1"
              min={1} // <-- FIX: Removed the stray 'A'
              allowDecimal={false}
              {...form.getInputProps("column")}
            />
          </Group>
          <NumberInput
            required
            label="Capacidade de Discos"
            placeholder="30"
            min={1}
            allowDecimal={false}
            {...form.getInputProps("capacity")}
          />
          <Button type="submit" mt="md">
            Salvar
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}