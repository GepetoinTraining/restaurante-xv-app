// PATH: app/dashboard/pospage/components/Cart.tsx
"use client";

import {
  Box,
  Paper,
  Text,
  Title,
  Stack,
  Group,
  ActionIcon,
  NumberInput,
  ScrollArea,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { ProductWithSerializedPrice } from "../page"; // Import updated type
import { formatCurrency } from "@/lib/utils";

export interface CartItem {
  product: ProductWithSerializedPrice;
  quantity: number;
}

interface CartProps {
  items: CartItem[];
  onRemove: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
}

export function Cart({ items, onRemove, onUpdateQuantity }: CartProps) {
  const total = items.reduce(
    (acc, item) =>
      acc + parseFloat(item.product.price) * item.quantity,
    0
  );

  return (
    <Paper shadow="sm" p="md" withBorder>
      <Stack>
        <Title order={4}>Carrinho</Title>
        <ScrollArea h={300}>
          <Stack gap="sm">
            {items.length === 0 ? (
              <Text c="dimmed" ta="center">
                Carrinho vazio
              </Text>
            ) : (
              items.map((item) => (
                <Box key={item.product.id}>
                  <Text size="sm" fw={500} truncate>
                    {item.product.name}
                  </Text>
                  <Group justify="space-between" align="flex-end">
                    <Text size="sm" c="dimmed">
                      {formatCurrency(parseFloat(item.product.price))}
                    </Text>
                    <Group gap="xs" align="center">
                      <NumberInput
                        value={item.quantity}
                        onChange={(value) =>
                          onUpdateQuantity(
                            item.product.id,
                            Number(value)
                          )
                        }
                        min={0}
                        max={99}
                        size="xs"
                        w={60}
                      />
                      <ActionIcon
                        color="red"
                        variant="transparent"
                        onClick={() => onRemove(item.product.id)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Box>
              ))
            )}
          </Stack>
        </ScrollArea>
        <Group justify="space-between" mt="md">
          <Text fw={700} size="lg">
            Total
          </Text>
          <Text fw={700} size="lg">
            {formatCurrency(total)}
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
}