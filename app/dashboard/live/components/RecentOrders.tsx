// PATH: app/dashboard/live/components/RecentOrders.tsx
// NOTE: This is a NEW FILE in a NEW FOLDER.

"use client";

import {
  Paper,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  Accordion,
} from "@mantine/core";
import { LiveOrder } from "@/app/api/live/route"; // Import the new type
import { formatCurrency } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecentOrdersProps {
  orders: LiveOrder[];
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <Paper withBorder p="md" radius="md">
      <Title order={4}>Pedidos Recentes (Última Hora)</Title>
      <Text size="sm" c="dimmed" mb="md">
        Novos pedidos enviados para as estações.
      </Text>
      <Stack>
        {orders.length > 0 ? (
          <Accordion variant="separated">
            {orders.map((order) => (
              <Accordion.Item value={order.id} key={order.id}>
                <Accordion.Control>
                  <Group justify="space-between">
                    <Stack gap={0}>
                      <Text fw={500}>
                        {order.visit.client.name} (
                        {order.items.length} itens)
                      </Text>
                      <Text size="xs" c="dimmed">
                        Pedido por: {order.handledBy[0]?.user.name || "N/A"}
                      </Text>
                    </Stack>
                    <Stack align="flex-end" gap={0}>
                      <Text fw={700}>
                        {/* Corrected order.total */}
                        {formatCurrency(parseFloat(order.total as unknown as string))}
                      </Text>
                      <Text size="xs">
                        {formatDistanceToNow(new Date(order.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </Text>
                    </Stack>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    {order.items.map((item) => (
                      <Group justify="space-between" key={item.id}>
                        <Text size="sm">
                          {item.quantity}x {item.product.name}
                        </Text>
                        <Badge variant="light" color="gray">
                          {/* ---- START FIX ---- */}
                          {/* Cast to unknown first, then to string */}
                          {formatCurrency(parseFloat(item.totalPrice as unknown as string))}
                          {/* ---- END FIX ---- */}
                        </Badge>
                      </Group>
                    ))}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        ) : (
          <Text c="dimmed">Nenhum pedido recente.</Text>
        )}
      </Stack>
    </Paper>
  );
}