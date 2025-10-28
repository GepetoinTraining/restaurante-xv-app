// PATH: app/dashboard/clients/[id]/components/ClientHeader.tsx
// NOTE: This is a NEW FILE.

"use client";

import {
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Button,
} from "@mantine/core";
import {
  IconUser,
  IconPhone,
  IconMail,
  IconHash,
  IconWallet,
  IconPlus,
} from "@tabler/icons-react";
import { ClientDetailsResponse } from "../page";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { AddCreditModal } from "./AddCreditModal";

interface ClientHeaderProps {
  client: ClientDetailsResponse;
  onRefresh: () => void;
}

export function ClientHeader({ client, onRefresh }: ClientHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const balance = parseFloat(client.wallet?.balance || "0");

  return (
    <>
      <Paper withBorder p="md" radius="md">
        <Stack>
          <Title order={3}>{client.name}</Title>
          <Group gap="sm">
            <IconPhone size={16} />
            <Text>{client.phone}</Text>
          </Group>
          <Group gap="sm">
            <IconMail size={16} />
            <Text>{client.email || "N/A"}</Text>
          </Group>
          <Group gap="sm">
            <IconHash size={16} />
            <Text>{client.cpf || "N/A"}</Text>
          </Group>

          <Stack gap="xs" mt="md" p="md" bg="dark.6" style={{ borderRadius: 8 }}>
            <Group gap="sm">
              <IconWallet size={16} />
              <Text fw={500}>Carteira (Wallet)</Text>
            </Group>
            <Text fz={32} fw={700}>
              {formatCurrency(balance)}
            </Text>
            <Button
              leftSection={<IconPlus size={14} />}
              onClick={() => setIsModalOpen(true)}
            >
              Adicionar Crédito
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <AddCreditModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          onRefresh(); // Refresh client data to show new balance
        }}
        clientId={client.id}
        clientName={client.name}
      />
    </>
  );
}