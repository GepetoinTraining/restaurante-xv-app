// PATH: app/dashboard/stock/components/AddStockHoldingModal.tsx
"use client";

import {
  Modal,
  Button,
  Stack,
  LoadingOverlay,
  NumberInput,
  Text,
  Title,
  Select,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import 'dayjs/locale/pt-br'; // Import locale for DateInput
import { useForm } from "@mantine/form";
import { useState, useEffect } from "react";
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { SerializedIngredientDef } from "../../ingredients/page"; // Use definition type

type StockLocation = { id: string; name: string };

type AddStockHoldingModalProps = {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ingredient: SerializedIngredientDef;
  locations: StockLocation[]; // Pass available locations
};

export function AddStockHoldingModal({
  opened,
  onClose,
  onSuccess,
  ingredient,
  locations,
}: AddStockHoldingModalProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      quantity: 1, // Default quantity
      venueObjectId: null as string | null,
      purchaseDate: new Date(),
      expiryDate: null as Date | null,
    },
    validate: {
      quantity: (val) => (val === undefined || val === null || Number(val) <= 0 ? "Quantidade deve ser positiva" : null),
      venueObjectId: (val) => (val ? null : "Localização é obrigatória"),
    },
  });

  // Reset form when modal opens or ingredient changes
  useEffect(() => {
     if (!opened) {
         form.reset();
     } else {
        // Optionally reset specific fields if needed when opening for a new ingredient
        // form.setFieldValue('venueObjectId', null);
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, ingredient]);


  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);

    const payload = {
      ingredientId: ingredient.id,
      venueObjectId: values.venueObjectId,
      quantity: values.quantity.toString(), // Send as string
      purchaseDate: values.purchaseDate ? values.purchaseDate.toISOString() : null,
      expiryDate: values.expiryDate ? values.expiryDate.toISOString() : null,
      // API will calculate costAtAcquisition if needed or use ingredient default
    };

    try {
      const response = await fetch("/api/stock-holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result: ApiResponse = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao adicionar lote de estoque");

      notifications.show({
        title: "Sucesso!",
        message: `Lote de "${ingredient.name}" adicionado ao estoque.`,
        color: "green",
      });
      // Don't reset form here, onSuccess will trigger onClose which resets via useEffect
      onSuccess();
    } catch (error: any) {
      notifications.show({
        title: "Erro",
        message: error.message,
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const locationOptions = locations.map(l => ({ label: l.name, value: l.id }));

  return (
    <Modal opened={opened} onClose={onClose} title="Adicionar Lote de Estoque" centered>
      <LoadingOverlay visible={loading} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Title order={4}>{ingredient.name}</Title>
          <Text size="sm" c="dimmed">Unidade Base: {ingredient.unit}</Text>

           <Select
              required
              label="Localização do Estoque"
              placeholder="Selecione onde este lote será armazenado"
              data={locationOptions}
              {...form.getInputProps("venueObjectId")}
              searchable
              // ---- START FIX ----
              // withinPortal // REMOVED this line
              // ---- END FIX ----
            />

          <NumberInput
            required
            label={`Quantidade (em ${ingredient.unit})`}
            placeholder="Ex: 1000 (para 1000ml ou 1000g)"
            min={0.001} // Allow small quantities
            decimalScale={3}
            step={1} // Adjust step if needed
            {...form.getInputProps("quantity")}
          />

          <DateInput
            label="Data da Compra/Produção (Opcional)"
            valueFormat="DD/MM/YYYY"
            locale="pt-br"
            {...form.getInputProps("purchaseDate")}
            clearable
          />
           <DateInput
            label="Data de Validade (Opcional)"
            valueFormat="DD/MM/YYYY"
            locale="pt-br"
            minDate={new Date()}
            {...form.getInputProps("expiryDate")}
            clearable
          />

          <Button type="submit" mt="md" color="blue" loading={loading}>
            Adicionar ao Estoque
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}