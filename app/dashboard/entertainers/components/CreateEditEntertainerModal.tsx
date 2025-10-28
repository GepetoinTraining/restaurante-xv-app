// PATH: app/dashboard/entertainers/components/CreateEditEntertainerModal.tsx
"use client";

import { useState } from "react";
import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Select,
  NumberInput,
  Stack,
  LoadingOverlay,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { EntertainerType } from "@prisma/client"; // Import enum
import { ApiResponse } from "@/lib/types";

interface CreateEditEntertainerModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // entertainer?: Entertainer; // Add this for editing later
}

// Data for the EntertainerType select input
const typeData = [
  { value: EntertainerType.DJ, label: "DJ" },
  { value: EntertainerType.BAND, label: "Banda" },
];

export function CreateEditEntertainerModal({
  opened,
  onClose,
  onSuccess,
}: CreateEditEntertainerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const isEditing = !!entertainer; // Add this for editing later

  const form = useForm({
    initialValues: {
      name: "",
      type: EntertainerType.DJ,
      bio: "",
      imageUrl: "",
      rate: 0,
    },
    validate: {
      name: (value) =>
        value.trim().length < 2 ? "Nome é obrigatório" : null,
      type: (value) => (value ? null : "Tipo é obrigatório"),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);
    try {
      // TODO: Add PUT method for editing
      const response = await fetch("/api/entertainers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          rate: values.rate > 0 ? values.rate.toString() : null,
        }),
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.success) {
        notifications.show({
          title: "Sucesso",
          message: "Artista salvo com sucesso!",
          color: "green",
        });
        form.reset();
        onSuccess();
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao salvar artista",
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
    <Modal
      opened={opened}
      onClose={handleClose}
      title={"Novo Artista"} // Change to "Editar Artista" when editing
    >
      <LoadingOverlay visible={isSubmitting} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            required
            label="Nome"
            placeholder="Nome artístico"
            {...form.getInputProps("name")}
          />
          <Select
            required
            label="Tipo"
            data={typeData}
            {...form.getInputProps("type")}
          />
          <Textarea
            label="Bio (Opcional)"
            placeholder="Breve descrição"
            {...form.getInputProps("bio")}
          />
          <TextInput
            label="URL da Imagem (Opcional)"
            placeholder="https://"
            {...form.getInputProps("imageUrl")}
          />
          <NumberInput
            label="Cachê (R$) (Opcional)"
            placeholder="150.00"
            decimalScale={2}
            fixedDecimalScale
            min={0}
            {...form.getInputProps("rate")}
          />
          <Button type="submit" mt="md">
            Salvar
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}