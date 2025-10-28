// PATH: app/dashboard/staff/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button, Container, Title, Stack } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { User, Workstation } from "@prisma/client"; // Import the new User type
import { PageHeader } from "../components/PageHeader";
import { StaffTable } from "./components/StaffTable"; // This component will also be refactored
import { CreateStaffModal } from "./components/CreateStaffModal"; // This component will also be refactored
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";

// Define a type for User with assignments included, based on the API response
export type UserWithWorkstation = User & {
  workstation: Workstation | null; // This is the simplified structure from the GET API
};

export default function StaffPage() {
  const [staff, setStaff] = useState<UserWithWorkstation[]>([]); // Use the new type
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/staff");
      const data: ApiResponse<UserWithWorkstation[]> = await response.json();
      if (data.success && data.data) {
        setStaff(data.data);
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao carregar equipe",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Fetch staff error:", error);
      notifications.show({
        title: "Erro",
        message: "Falha ao carregar equipe",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Equipe" />
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={() => setIsModalOpen(true)}
          w={200}
        >
          Novo Membro
        </Button>
        <StaffTable
          data={staff}
          isLoading={isLoading}
          onRefresh={fetchStaff}
        />
      </Stack>
      <CreateStaffModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchStaff();
        }}
      />
    </Container>
  );
}