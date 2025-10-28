// PATH: app/dashboard/clients/[id]/components/ClientHistory.tsx
// NOTE: This is a NEW FILE.

"use client";

import { Tabs, Table, Text, Group, Badge, Accordion, Title } from "@mantine/core";
import {
  IconHistory,
  IconShoppingCart,
  IconWallet,
} from "@tabler/icons-react";
import { ClientDetailsResponse } from "../page";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { TransactionStatus, TransactionType } from "@prisma/client";

interface ClientHistoryProps {
  client: ClientDetailsResponse;
}

export function ClientHistory({ client }: ClientHistoryProps) {
  return (
    <Tabs defaultValue="visits">
      <Tabs.List>
        <Tabs.Tab value="visits" leftSection={<IconHistory size={14} />}>
          Visitas ({client.visits.length})
        </Tabs.Tab>
        <Tabs.Tab value="transactions" leftSection={<IconWallet size={14} />}>
          Transações da Carteira (
          {client.wallet?.transactions?.length || 0})
        </Tabs.Tab>
      </Tabs.List>

      {/* --- Visits Tab --- */}
      <Tabs.Panel value="visits" pt="xs">
        {client.visits.length === 0 ? (
          <Text c="dimmed" mt="md">
            Nenhuma visita registrada.
          </Text>
        ) : (
          <Accordion variant="separated">
            {client.visits.map((visit: any) => (
              <Accordion.Item value={visit.id} key={visit.id}>
                <Accordion.Control>
                  <Group justify="space-between">
                    <Text fw={500}>
                      {format(new Date(visit.checkInAt), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </Text>
                    <Badge color={visit.checkOutAt ? "gray" : "green"}>
                      {visit.checkOutAt ? "Finalizada" : "Ativa"}
                    </Badge>
                    <Text fw={700}>
                      {formatCurrency(parseFloat(visit.totalSpent))}
                    </Text>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Title order={5} mb="xs">
                    Pedidos ({visit.orders.length})
                  </Title>
                  {visit.orders.length === 0 ? (
                     <Text c="dimmed" size="sm">Nenhum pedido nesta visita.</Text>
                  ) : (
                    <Table>
                      <Table.Thead>
                         <Table.Tr>
                           <Table.Th>Data/Hora</Table.Th>
                           <Table.Th>Itens</Table.Th>
                           <Table.Th>Total</Table.Th>
                         </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {visit.orders.map((order: any) => (
                          <Table.Tr key={order.id}>
                            <Table.Td>
                              {format(new Date(order.createdAt), "HH:mm", {
                                locale: ptBR,
                              })}
                            </Table.Td>
                            <Table.Td>{order.items.length}</Table.Td>
                            <Table.Td>{formatCurrency(parseFloat(order.total))}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        )}
      </Tabs.Panel>

      {/* --- Wallet Transactions Tab --- */}
      <Tabs.Panel value="transactions" pt="xs">
        {!client.wallet || client.wallet.transactions.length === 0 ? (
          <Text c="dimmed" mt="md">
            Nenhuma transação na carteira.
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Data</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Valor</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {client.wallet.transactions.map((tx: any) => (
                <Table.Tr key={tx.id}>
                  <Table.Td>
                    {format(new Date(tx.createdAt), "dd/MM/yy HH:mm", {
                      locale: ptBR,
                    })}
                  </Table.Td>
                  <Table.Td>
                    {tx.type === TransactionType.TOP_UP ? "Recarga" : "Gasto"}
                  </Table.Td>
                  <Table.Td>
                    <Text
                      c={
                        tx.type === TransactionType.TOP_UP ? "green" : "red"
                      }
                      fw={500}
                    >
                      {formatCurrency(parseFloat(tx.amount))}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={tx.status === TransactionStatus.COMPLETED ? "green" : tx.status === TransactionStatus.PENDING ? "yellow" : "red"}>
                      {tx.status}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Tabs.Panel>
    </Tabs>
  );
}