// PATH: app/dashboard/clients/[id]/components/AddCreditModal.tsx
'use client';

import { useState } from 'react';
import { Modal, Button, NumberInput, TextInput, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ApiResponse } from '@/lib/types';
// --- START FIX: Import correct Enum value ---
import { TransactionType, TransactionStatus } from '@prisma/client';
// --- END FIX ---

interface AddCreditModalProps {
  opened: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: (updatedTransaction: any) => void; // Callback to update UI
}

export function AddCreditModal({ opened, onClose, clientId, onSuccess }: AddCreditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      amount: '',
      proofOfPay: '',
    },
    validate: {
      amount: (value) => {
        if (!value) return 'Valor é obrigatório';
        try {
          const num = parseFloat(value);
          if (isNaN(num) || num <= 0) return 'Valor deve ser positivo';
        } catch {
          return 'Formato inválido';
        }
        return null;
      },
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/wallet-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          amount: values.amount,
          // --- START FIX: Use correct Enum value ---
          type: TransactionType.DEPOSIT, // Use DEPOSIT instead of TOP_UP
          // --- END FIX ---
          status: TransactionStatus.COMPLETED, // Assume staff-added credit is completed
          proofOfPay: values.proofOfPay || null,
        }),
      });

      const data: ApiResponse = await response.json();

      if (data.success && data.data) {
        notifications.show({
          title: 'Sucesso!',
          message: `Crédito de R$ ${values.amount} adicionado ao cliente.`,
          color: 'green',
        });
        onSuccess(data.data); // Pass the new transaction back
        handleClose(); // Close modal on success
      } else {
        setError(data.error || 'Falha ao adicionar crédito.');
      }
    } catch (err) {
      setError('Erro de conexão ao servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset(); // Clear form
    setError(null); // Clear errors
    onClose(); // Call the parent close handler
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Adicionar Crédito">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <NumberInput
          label="Valor a Adicionar (R$)"
          placeholder="Ex: 50.00"
          required
          decimalScale={2}
          fixedDecimalScale
          {...form.getInputProps('amount')}
        />
        <TextInput
          label="Comprovante (Opcional)"
          placeholder="Ex: PIX ID, Depósito #123"
          mt="md"
          {...form.getInputProps('proofOfPay')}
        />

        {error && (
          <Alert color="red" title="Erro" mt="md" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Button type="submit" mt="xl" loading={isLoading} fullWidth>
          Confirmar Crédito
        </Button>
      </form>
    </Modal>
  );
}