// File: app/dashboard/clients/[id]/components/ClientVisitHistory.tsx
"use client";

import {
  Paper,
  Title,
  Text,
  Stack,
  Accordion,
  ThemeIcon,
  Group,
  Table,
} from "@mantine/core";
// Import the correctly named and structured type
import { VisitWithOrdersAndVenueObject } from "@/lib/types"; // Corrected import name
import { Calendar } from "lucide-react";
import dayjs from "dayjs";
import { formatCurrency } from "@/lib/utils";
import React from "react"; // Needed for ReactNode

type ClientVisitHistoryProps = {
  // Use the updated type
  visits: VisitWithOrdersAndVenueObject[];
};

export function ClientVisitHistory({ visits }: ClientVisitHistoryProps) {
  if (!visits || visits.length === 0) {
    return (
      <Paper withBorder p="md" radius="md" mt="md">
        <Title order={4}>Histórico de Visitas</Title>
        <Text c="dimmed" mt="md">
          Este cliente ainda não tem visitas registradas.
        </Text>
      </Paper>
    );
  }

  const items = visits.map((visit) => {
    // visit.totalSpent is already a string, parse it
    const visitTotal = parseFloat(visit.totalSpent) || 0;

    // Flatten order items for display
    const orderItemsRows = visit.orders.flatMap((order) =>
        order.items.map((item): React.ReactNode => ( // Explicitly type the row as ReactNode
         <Table.Tr key={`${order.id}-${item.productId}-${item.id}`}> {/* More specific key */}
            <Table.Td>
              {dayjs(order.createdAt).format("HH:mm")}
            </Table.Td>
            <Table.Td>{item.product?.name || "Produto Deletado"}</Table.Td>
            <Table.Td>{item.quantity}</Table.Td> {/* Quantity should be number or string */}
            {/* unitPrice and totalPrice are strings, parse before formatting */}
            <Table.Td>{formatCurrency(parseFloat(item.unitPrice) || 0)}</Table.Td>
            <Table.Td>{formatCurrency(parseFloat(item.totalPrice) || 0)}</Table.Td>
            {/* Safely access handler name */}
            <Table.Td>{order.handledBy?.[0]?.user?.name ?? "N/A"}</Table.Td>
          </Table.Tr>
        ))
    );


    return (
      <Accordion.Item key={visit.id} value={visit.id}> {/* Use string ID for value */}
        <Accordion.Control>
          <Group justify="space-between">
             <Group>
                <ThemeIcon color="teal" variant="light">
                  <Calendar size={16} />
                </ThemeIcon>
                <Stack gap={0}>
                  <Text fw={500}>
                    {dayjs(visit.checkInAt).format("DD/MM/YYYY [às] HH:mm")}
                    {visit.checkOutAt ? ` - ${dayjs(visit.checkOutAt).format("HH:mm")}` : ' (Ativa)'}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Total Gasto: {formatCurrency(visitTotal)} • {visit.orders.length}{" "}
                    pedido(s)
                  </Text>
                   {/* Access venueObject correctly */}
                   {visit.venueObject && (
                       <Text size="xs" c="dimmed">
                           Local: {visit.venueObject.name}
                       </Text>
                   )}
                </Stack>
             </Group>
              <Text fw={500} mr="md">{formatCurrency(visitTotal)}</Text>
          </Group>
        </Accordion.Control>
        <Accordion.Panel>
           {orderItemsRows.length > 0 ? (
               <Table.ScrollContainer minWidth={600}>
                 <Table striped withTableBorder>
                   <Table.Thead>
                     <Table.Tr>
                       <Table.Th>Hora</Table.Th>
                       <Table.Th>Produto</Table.Th>
                       <Table.Th>Qtd.</Table.Th>
                       <Table.Th>Preço Unit.</Table.Th>
                       <Table.Th>Total Item</Table.Th>
                       <Table.Th>Staff</Table.Th>
                     </Table.Tr>
                   </Table.Thead>
                   <Table.Tbody>{orderItemsRows}</Table.Tbody>
                 </Table>
               </Table.ScrollContainer>
           ) : (
                <Text size="sm" c="dimmed" ta="center" my="sm">Nenhum item comprado nesta visita.</Text>
           )}
        </Accordion.Panel>
      </Accordion.Item>
    );
  });

  return (
    <Paper withBorder p="md" radius="md" mt="md">
      <Title order={4}>Histórico de Visitas ({visits.length})</Title>
      <Accordion chevronPosition="left" variant="contained" mt="md">
        {items}
      </Accordion>
    </Paper>
  );
}