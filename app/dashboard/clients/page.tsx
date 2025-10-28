// PATH: app/dashboard/clients/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button, Container, Stack } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { Client } from "@prisma/client";
import { PageHeader } from "../components/PageHeader";
import { ClientTable } from "./components/ClientTable";
import { CreateClientModal } from "./components/CreateClientModal"; // This component is fine as-is
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";

// Define the type for the API response
export type ClientWithWallet = Client & {
  wallet: {
    balance: string; // Balance is a string
  } | null;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithWallet[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/clients");
      const data: ApiResponse<ClientWithWallet[]> = await response.json();
      if (data.success && data.data) {
        setClients(data.data);
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao carregar clientes",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Fetch clients error:", error);
      notifications.show({
        title: "Erro",
        message: "Falha ao carregar clientes",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Clientes" />
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={() => setIsModalOpen(true)}
          w={200}
        >
          Novo Cliente
        </Button>
        <ClientTable
          data={clients}
          isLoading={isLoading}
          onRefresh={fetchClients}
        />
      </Stack>
      <CreateClientModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchClients();
        }}
      />
    </Container>
  );
}