// PATH: app/dashboard/clients/[id]/components/AddCreditModal.tsx
// NOTE: This is a NEW FILE.

"use client";

import { useState } from "react";
import {
  Modal,
  Button,
  NumberInput,
  Stack,
  LoadingOverlay,
  Text,
  Select,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { ApiResponse } from "@/lib/types";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { formatCurrency } from "@/lib/utils"; // Import the function

interface AddCreditModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientId: string;
  clientName: string;
}

export function AddCreditModal({
  opened,
  onClose,
  onSuccess,
  clientId,
  clientName,
}: AddCreditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      amount: 0,
      status: TransactionStatus.COMPLETED, // Default to completed for staff
    },
    validate: {
      amount: (value) =>
        value <= 0 ? "Valor deve ser maior que zero" : null,
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/wallet-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId,
          amount: values.amount.toString(),
          type: TransactionType.TOP_UP,
          status: values.status,
          proofOfPay: "Adicionado manualmente pela equipe",
        }),
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.success) {
        notifications.show({
          title: "Sucesso!",
          message: `Crédito de ${formatCurrency( // Now works correctly
            values.amount
          )} adicionado para ${clientName}.`,
          color: "green",
        });
        form.reset();
        onSuccess();
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao adicionar crédito",
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
      title={`Adicionar Crédito para ${clientName}`}
    >
      <LoadingOverlay visible={isSubmitting} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <NumberInput
            required
            label="Valor a Adicionar (R$)"
            placeholder="50.00"
            decimalScale={2}
            fixedDecimalScale
            min={0.01}
            {...form.getInputProps("amount")}
          />
          <Select
            label="Status da Transação"
            data={[
              { value: TransactionStatus.COMPLETED, label: "Completa (Adicionar Saldo Agora)" },
              { value: TransactionStatus.PENDING, label: "Pendente (Aguardar Aprovação)" },
            ]}
            {...form.getInputProps("status")}
          />
          <Text size="xs" c="dimmed">
            Se "Completa", o saldo será atualizado imediatamente. Se "Pendente",
            irá para a fila de aprovação.
          </Text>
          <Button type="submit" mt="md">
            Confirmar
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}