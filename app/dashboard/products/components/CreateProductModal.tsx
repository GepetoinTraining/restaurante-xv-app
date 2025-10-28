// PATH: app/dashboard/products/components/CreateProductModal.tsx
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
import { ProductType, Workstation } from "@prisma/client"; // Import types
import { ApiResponse } from "@/lib/types";

interface CreateProductModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workstations: Workstation[]; // Receive the list of workstations
}

// Data for the ProductType select input
const productTypeData = [
  { value: ProductType.DRINK, label: "Bebida" },
  { value: ProductType.FOOD, label: "Comida" },
];

export function CreateProductModal({
  opened,
  onClose,
  onSuccess,
  workstations,
}: CreateProductModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      price: 0,
      imageUrl: "",
      type: ProductType.DRINK, // Default value
      prepStationId: "", // ID of the workstation
    },
    validate: {
      name: (value) =>
        value.trim().length < 2 ? "Nome deve ter pelo menos 2 caracteres" : null,
      price: (value) =>
        value <= 0 ? "Preço deve ser maior que zero" : null,
      type: (value) => (value ? null : "Tipo é obrigatório"),
      prepStationId: (value) =>
        value ? null : "Estação de preparo é obrigatória",
    },
  });

  // Format workstations for the Select component
  const workstationData = workstations.map((w) => ({
    value: w.id,
    label: w.name,
  }));

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          // Ensure price is sent as a string to be parsed by Decimal on server
          price: values.price.toString(),
        }),
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.success) {
        notifications.show({
          title: "Sucesso",
          message: "Produto criado com sucesso!",
          color: "green",
        });
        form.reset();
        onSuccess();
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao criar produto",
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
    <Modal opened={opened} onClose={handleClose} title="Novo Produto">
      <LoadingOverlay visible={isSubmitting} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            required
            label="Nome"
            placeholder="Nome do produto"
            {...form.getInputProps("name")}
          />
          <Textarea
            label="Descrição"
            placeholder="Descrição do produto (opcional)"
            {...form.getInputProps("description")}
          />
          <NumberInput
            required
            label="Preço (R$)"
            placeholder="19.90"
            decimalScale={2}
            fixedDecimalScale
            min={0.01}
            {...form.getInputProps("price")}
          />
          <Select
            required
            label="Tipo"
            data={productTypeData}
            {...form.getInputProps("type")}
          />
          <Select
            required
            label="Estação de Preparo"
            placeholder="Selecione a estação"
            data={workstationData}
            {...form.getInputProps("prepStationId")}
            searchable
          />
          <TextInput
            label="URL da Imagem"
            placeholder="https://... (opcional)"
            {...form.getInputProps("imageUrl")}
          />
          <Button type="submit" mt="md">
            Salvar
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}