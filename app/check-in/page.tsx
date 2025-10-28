// PATH: app/check-in/page.tsx
"use client";

import { useState } from "react";
import {
  Container,
  Paper,
  TextInput,
  Button,
  Title,
  Stack,
  LoadingOverlay,
  Text,
  Group,
  Anchor,
  Box,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { ApiResponse } from "@/lib/types";
import { IconCheck, IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { Client, Visit, Tab } from "@prisma/client"; // Import new types

// This type is the expected response from the API
type CheckInResponse = {
  client: Client;
  visit: Visit;
  tab: Tab;
};

export default function CheckInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<CheckInResponse | null>(null);

  const form = useForm({
    initialValues: {
      phone: "",
      name: "",
      rfid: "",
    },
    validate: {
      phone: (value) =>
        /^\d{10,11}$/.test(value)
          ? null
          : "Telefone inválido (deve ter 10-11 dígitos)",
      rfid: (value) => (value.trim() ? null : "RFID é obrigatório"),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsLoading(true);
    setSuccessData(null);
    try {
      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data: ApiResponse<CheckInResponse> = await response.json();

      if (response.ok && data.success && data.data) {
        notifications.show({
          title: "Check-in Realizado!",
          message: `Cliente ${data.data.client.name} entrou com o Tab ${data.data.tab.rfid}`,
          color: "green",
          icon: <IconCheck />,
        });
        setSuccessData(data.data); // Save success data to show summary

        // --- ADDED THIS LINE ---
        // Store the active tab's RFID in localStorage for the menu page
        localStorage.setItem("activeTabId", data.data.tab.rfid);
        // -----------------------

        form.reset();
      } else {
        notifications.show({
          title: "Erro no Check-in",
          message: data.error || "Não foi possível realizar o check-in",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Check-in error:", error);
      notifications.show({
        title: "Erro",
        message: "Ocorreu um erro de rede inesperado",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSuccessData(null);
    form.reset();
  };

  return (
    <Container size="xs" my={40}>
      <Title ta="center">Check-in de Cliente</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
        Associe um cliente a um Tab (RFID) para iniciar uma visita.
      </Text>

      <Paper withBorder shadow="md" p={30} radius="md">
        <LoadingOverlay visible={isLoading} />

        {successData ? (
          // --- Success View ---
          <Stack align="center">
            <IconCheck size={60} color="green" />
            <Title order={3} ta="center">
              Check-in Confirmado!
            </Title>
            <Text>
              Cliente: <Text span fw={700}>{successData.client.name}</Text>
            </Text>
            <Text>
              Tab (RFID): <Text span fw={700}>{successData.tab.rfid}</Text>
            </Text>
            <Button onClick={resetForm} mt="md">
              Novo Check-in
            </Button>
          </Stack>
        ) : (
          // --- Form View ---
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <TextInput
                required
                label="Telefone do Cliente (com DDD)"
                placeholder="47999887766"
                {...form.getInputProps("phone")}
              />
              <TextInput
                label="Nome do Cliente (apenas se for novo)"
                placeholder="Nome completo"
                {...form.getInputProps("name")}
              />
              <TextInput
                required
                label="ID do Tab (RFID)"
                placeholder="Passe o cartão RFID..."
                {...form.getInputProps("rfid")}
              />
              <Button type="submit" mt="lg">
                Confirmar Check-in
              </Button>
            </Stack>
          </form>
        )}
      </Paper>
      <Box mt="md">
        <Anchor component={Link} href="/dashboard/live">
          <Group gap="xs">
            <IconArrowLeft size={14} />
            Voltar ao Dashboard
          </Group>
        </Anchor>
      </Box>
    </Container>
  );
}