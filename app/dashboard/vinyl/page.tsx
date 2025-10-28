// PATH: app/dashboard/vinyl/page.tsx
// Refactored page (was vynil/page.tsx)

"use client";

import { useState, useEffect } from "react";
import { Button, Container, Stack, Group, Tabs, Text } from "@mantine/core";
import { IconPlus, IconAlbum, IconBuildingWarehouse } from "@tabler/icons-react";
import { VinylLibrarySlot, VinylRecord } from "@prisma/client";
import { PageHeader } from "../components/PageHeader";
import { VinylRecordTable } from "./components/VinylRecordTable";
import { CreateEditVinylRecordModal } from "./components/CreateEditVinylRecordModal";
import { CreateSlotModal } from "./components/CreateSlotModal"; // New modal
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";

// Define type for record with its slot
export type VinylRecordWithSlot = VinylRecord & {
  slot: VinylLibrarySlot;
};

export default function VinylLibraryPage() {
  const [records, setRecords] = useState<VinylRecordWithSlot[]>([]);
  const [slots, setSlots] = useState<VinylLibrarySlot[]>([]);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/vinyl-records");
      const data: ApiResponse<VinylRecordWithSlot[]> = await response.json();
      if (data.success && data.data) {
        setRecords(data.data);
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao carregar discos",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Fetch records error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSlots = async () => {
    try {
      const response = await fetch("/api/vinyl-slots");
      const data: ApiResponse<VinylLibrarySlot[]> = await response.json();
      if (data.success && data.data) {
        setSlots(data.data);
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao carregar slots",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Fetch slots error:", error);
    }
  };

  useEffect(() => {
    // Fetch both records and slots
    Promise.all([fetchRecords(), fetchSlots()]);
  }, []);

  const refreshAll = () => {
    fetchRecords();
    fetchSlots();
  };

  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Biblioteca de Vinil" />
        <Group>
          <Button
            leftSection={<IconAlbum size={14} />}
            onClick={() => setIsRecordModalOpen(true)}
            disabled={slots.length === 0} // Can't add record if no slots exist
          >
            Novo Disco
          </Button>
          <Button
            leftSection={<IconBuildingWarehouse size={14} />}
            onClick={() => setIsSlotModalOpen(true)}
            variant="outline"
          >
            Novo Slot (Prateleira)
          </Button>
        </Group>

        {slots.length === 0 && !isLoading && (
          <Text c="dimmed">
            Você precisa criar um "Slot (Prateleira)" antes de adicionar discos.
          </Text>
        )}

        {/* We can add a Tabs component here later to show slots vs records */}
        <VinylRecordTable
          data={records}
          isLoading={isLoading}
          onRefresh={refreshAll}
        />
      </Stack>

      {/* Modal for creating/editing records */}
      <CreateEditVinylRecordModal
        opened={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={() => {
          setIsRecordModalOpen(false);
          refreshAll();
        }}
        slots={slots} // Pass the list of slots
      />

      {/* Modal for creating slots */}
      <CreateSlotModal
        opened={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        onSuccess={() => {
          setIsSlotModalOpen(false);
          refreshAll();
        }}
      />
    </Container>
  );
}