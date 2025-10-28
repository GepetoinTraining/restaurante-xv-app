// PATH: app/dashboard/clients/components/ClientTable.tsx
"use client";

import {
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  Text,
  Loader,
  Anchor,
} from "@mantine/core";
import { IconPencil, IconTrash, IconEye } from "@tabler/icons-react";
import { ClientWithWallet } from "../page"; // Import the new type
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientTableProps {
  data: ClientWithWallet[];
  isLoading: boolean;
  onRefresh: () => void;
  // TODO: Add onEdit and onDelete handlers
}

export function ClientTable({ data, isLoading, onRefresh }: ClientTableProps) {
  const rows = data.map((client) => {
    const balance = parseFloat(client.wallet?.balance || "0");
    return (
      <Table.Tr key={client.id}>
        <Table.Td>
          <Anchor
            component={Link}
            href={`/dashboard/clients/${client.id}`}
            size="sm"
            fw={500}
          >
            {client.name}
          </Anchor>
          <Text size="xs" c="dimmed">
            {client.phone}
          </Text>
        </Table.Td>
        <Table.Td>{client.email || "N/A"}</Table.Td>
        <Table.Td>{client.cpf || "N/A"}</Table.Td>
        <Table.Td>
          <Badge color={balance > 0 ? "green" : balance < 0 ? "red" : "gray"}>
            {formatCurrency(balance)}
          </Badge>
        </Table.Td>
        <Table.Td>
          {format(new Date(client.createdAt), "dd/MM/yyyy", { locale: ptBR })}
        </Table.Td>
        <Table.Td>
          <Tooltip label="Ver Detalhes">
            <ActionIcon
              variant="transparent"
              color="blue"
              component={Link}
              href={`/dashboard/clients/${client.id}`}
            >
              <IconEye size={18} />
            </ActionIcon>
          </Tooltip>
          {/* Add Edit/Delete later */}
        </Table.Td>
      </Table.Tr>
    );
  });

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Table.ScrollContainer minWidth={700}>
      <Table verticalSpacing="sm" striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nome / Telefone</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>CPF</Table.Th>
            <Table.Th>Saldo (R$)</Table.Th>
            <Table.Th>Cliente Desde</Table.Th>
            <Table.Th>Ações</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text ta="center">Nenhum cliente encontrado</Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}