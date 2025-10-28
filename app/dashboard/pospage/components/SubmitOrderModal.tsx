// PATH: app/dashboard/pospage/components/SubmitOrderModal.tsx
"use client";

import {
  Modal,
  Button,
  Stack,
  Group,
  Text,
  Title,
  Box,
  Paper,
  LoadingOverlay,
} from "@mantine/core";
import { CartItem } from "./Cart";
import { formatCurrency } from "@/lib/utils";
import { ActiveVisitResponse } from "@/app/api/visits/active/route"; // Import type

interface SubmitOrderModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: () => void;
  cart: CartItem[];
  isSubmitting: boolean;
  visit: ActiveVisitResponse | null; // Pass the selected visit
}

export function SubmitOrderModal({
  opened,
  onClose,
  onSubmit,
  cart,
  isSubmitting,
  visit, // Receive the visit
}: SubmitOrderModalProps) {
  const total = cart.reduce(
    (acc, item) =>
      acc + parseFloat(item.product.price) * item.quantity,
    0
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Confirmar Pedido"
      size="md"
    >
      <Box pos="relative">
        <LoadingOverlay visible={isSubmitting} />
        <Stack>
          {visit ? (
            <Paper p="sm" withBorder>
              <Text size="sm">Cliente:</Text>
              <Title order={4}>{visit.client.name}</Title>
              <Text size="sm">Tab: {visit.tab.rfid}</Text>
            </Paper>
          ) : (
            <Text c="red" fw={700}>
              ERRO: Nenhuma visita selecionada.
            </Text>
          )}

          <Title order={5} mt="md">
            Itens do Pedido:
          </Title>
          <Stack gap="xs">
            {cart.map((item) => (
              <Group justify="space-between" key={item.product.id}>
                <Text>
                  {item.quantity}x {item.product.name}
                </Text>
                <Text>
                  {formatCurrency(
                    parseFloat(item.product.price) * item.quantity
                  )}
                </Text>
              </Group>
            ))}
          </Stack>
          <Group justify="space-between" mt="md">
            <Title order={3}>Total</Title>
            <Title order={3}>{formatCurrency(total)}</Title>
          </Group>
          <Button
            size="lg"
            color="green"
            onClick={onSubmit}
            disabled={isSubmitting || !visit}
          >
            Confirmar e Enviar Pedido
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
}