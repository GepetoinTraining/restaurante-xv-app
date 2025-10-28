// PATH: app/dashboard/stock/components/AdjustStockHoldingModal.tsx
"use client";

import {
  Modal,
  Button,
  Stack,
  LoadingOverlay,
  NumberInput,
  Text,
  Title,
  SegmentedControl,
} from "@mantine/core";
import { useForm } from "@mantine/form";
// ---- START FIX ----
import { useState, useEffect } from "react"; // Import useEffect
// ---- END FIX ----
import { ApiResponse, SerializedStockHolding } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type AdjustStockHoldingModalProps = {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  holding: SerializedStockHolding;
};

type Action = "SET" | "ADJUST";

export function AdjustStockHoldingModal({
  opened,
  onClose,
  onSuccess,
  holding,
}: AdjustStockHoldingModalProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<Action>("SET");

  const form = useForm({
    initialValues: {
      value: parseFloat(holding.quantity), // Start with current quantity for SET
    },
    validate: {
      value: (val, values) => {
        if (val === null || val === undefined) return 'Valor é obrigatório';
        if (action === 'SET' && val < 0) return 'Nova quantidade não pode ser negativa';
        if (action === 'ADJUST' && val === 0) return 'Ajuste não pode ser zero';
        // Check if adjustment leads to negative
        if (action === 'ADJUST' && (parseFloat(holding.quantity) + val < 0)) {
            return 'Ajuste resultaria em estoque negativo';
        }
        return null;
      }
    },
  });

   // ---- START FIX ----
   // Reset form when holding changes or modal opens/closes
   // Use useEffect instead of useState here
   useEffect(() => {
        if (opened) {
            form.setValues({ value: parseFloat(holding.quantity) });
            setAction('SET'); // Default to SET when opening
        } else {
             form.reset();
        }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [holding, opened]); // Dependency array is correct for useEffect
   // ---- END FIX ----

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);

    const payload: { quantity?: string; adjustment?: string } = {};
    if (action === 'SET') {
      payload.quantity = values.value.toString();
    } else { // ADJUST
      payload.adjustment = values.value.toString();
    }

    try {
      const response = await fetch(`/api/stock-holdings/${holding.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result: ApiResponse = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao ajustar estoque");

      notifications.show({
        title: "Sucesso!",
        message: `Estoque do lote de "${holding.ingredient.name}" atualizado.`,
        color: "green",
      });
      onSuccess(); // Close modal and refresh data via parent
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

  const handleActionChange = (value: string) => {
      const newAction = value as Action;
      setAction(newAction);
      // Reset value field based on action
      form.setFieldValue('value', newAction === 'SET' ? parseFloat(holding.quantity) : 0);
  }

  const currentQuantityFormatted = parseFloat(holding.quantity).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  const unit = holding.ingredient.unit;

  return (
    <Modal opened={opened} onClose={onClose} title="Ajustar Lote de Estoque" centered>
      <LoadingOverlay visible={loading} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Title order={4}>{holding.ingredient.name}</Title>
          <Text size="sm" c="dimmed">Local: {holding.location.name}</Text>
          {holding.purchaseDate && <Text size="sm" c="dimmed">Compra: {format(new Date(holding.purchaseDate), 'dd/MM/yy', { locale: ptBR })}</Text>}
          {holding.expiryDate && <Text size="sm" c="dimmed">Validade: {format(new Date(holding.expiryDate), 'dd/MM/yy', { locale: ptBR })}</Text>}
          <Text mt="xs">Quantidade Atual: <Text span fw={700}>{currentQuantityFormatted} {unit}</Text></Text>

          <SegmentedControl
            fullWidth
            value={action}
            onChange={handleActionChange}
            data={[
              { label: "Definir Nova Qtd.", value: "SET" },
              { label: "Adicionar/Subtrair", value: "ADJUST" },
            ]}
            color="blue"
            mt="md"
          />

          {action === 'SET' && (
             <NumberInput
                required
                label={`Nova Quantidade Total (em ${unit})`}
                placeholder={currentQuantityFormatted}
                min={0}
                decimalScale={3}
                mt="sm"
                {...form.getInputProps("value")}
             />
          )}

           {action === 'ADJUST' && (
             <NumberInput
                required
                label={`Ajuste (+/- em ${unit})`}
                placeholder="Ex: -10 ou 25.5"
                allowNegative
                decimalScale={3}
                 mt="sm"
                {...form.getInputProps("value")}
             />
          )}

          <Button type="submit" mt="md" color="blue" loading={loading}>
            Confirmar Ajuste
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}