// PATH: app/dashboard/entertainers/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button, Container, Stack } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { Entertainer } from "@prisma/client";
import { PageHeader } from "../components/PageHeader";
import { EntertainerTable } from "./components/EntertainerTable";
import { CreateEditEntertainerModal } from "./components/CreateEditEntertainerModal";
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";

// Type for API response (rate is a string)
export type SerializedEntertainer = Omit<Entertainer, "rate"> & {
  rate: string | null;
};

export default function EntertainersPage() {
  const [entertainers, setEntertainers] = useState<SerializedEntertainer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntertainers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/entertainers");
      const data: ApiResponse<SerializedEntertainer[]> = await response.json();
      if (data.success && data.data) {
        setEntertainers(data.data);
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao carregar entertainers",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Fetch entertainers error:", error);
      notifications.show({
        title: "Erro",
        message: "Falha ao carregar entertainers",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntertainers();
  }, []);

  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Artistas / DJs" />
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={() => setIsModalOpen(true)}
          w={200}
        >
          Novo Artista
        </Button>
        <EntertainerTable
          data={entertainers}
          isLoading={isLoading}
          onRefresh={fetchEntertainers}
        />
      </Stack>
      <CreateEditEntertainerModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchEntertainers();
        }}
      />
    </Container>
  );
}