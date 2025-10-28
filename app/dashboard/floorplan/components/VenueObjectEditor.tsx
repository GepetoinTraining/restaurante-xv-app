// PATH: app/dashboard/floorplan/components/VenueObjectEditor.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Button,
  Group,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconQrcode, // CORRECTED: Was IconQrCode
} from "@tabler/icons-react";
import {
  VenueObjectType,
  Workstation,
} from "@prisma/client";
import { FloorPlanWithObjects } from "./FloorPlanManager"; // Import the type
import { CreateVenueObjectModal } from "./CreateVenueObjectModal"; // We will create this next
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";

interface VenueObjectEditorProps {
  floorPlan: FloorPlanWithObjects;
  onRefresh: () => void;
}

// Helper to format VenueObjectType
const formatObjectType = (type: VenueObjectType) => {
  switch (type) {
    case "TABLE":
      return "Mesa";
    case "BAR_SEAT":
      return "Lugar no Bar";
    case "WORKSTATION":
      return "Estação (PDV)";
    case "ENTERTAINMENT":
      return "Entretenimento";
    case "IMPASSABLE":
      return "Obstrução";
    default:
      return type;
  }
};

export function VenueObjectEditor({
  floorPlan,
  onRefresh,
}: VenueObjectEditorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);

  // Fetch workstations to pass to the modal
  const fetchWorkstations = async () => {
    try {
      const response = await fetch("/api/workstations");
      const data: ApiResponse<Workstation[]> = await response.json();
      if (data.success && data.data) {
        setWorkstations(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch workstations", error);
    }
  };

  useEffect(() => {
    fetchWorkstations();
  }, []);

  const handleDelete = async (objectId: string) => {
    if (!confirm("Tem certeza que deseja remover este objeto?")) return;

    try {
      const res = await fetch("/api/venue-objects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: objectId }),
      });

      const data: ApiResponse = await res.json();

      if (data.success) {
        notifications.show({
          title: "Sucesso",
          message: "Objeto removido.",
          color: "green",
        });
        onRefresh(); // Refresh the object list
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao remover objeto.",
          color: "red",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Erro",
        message: "Erro inesperado.",
        color: "red",
      });
    }
  };

  const rows = floorPlan.objects.map((obj) => (
    <Table.Tr key={obj.id}>
      <Table.Td>{obj.name}</Table.Td>
      <Table.Td>
        <Badge>{formatObjectType(obj.type)}</Badge>
      </Table.Td>
      <Table.Td>{obj.workstation?.name || "N/A"}</Table.Td>
      <Table.Td>
        <Tooltip label="Ver QR Code (em breve)">
          <ActionIcon variant="transparent" color="gray">
            {/* CORRECTED: Was IconQrCode */}
            <IconQrcode size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Editar (em breve)">
          <ActionIcon variant="transparent" color="blue">
            <IconPencil size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Remover">
          <ActionIcon
            variant="transparent"
            color="red"
            onClick={() => handleDelete(obj.id)}
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text fw={500}>Objetos em "{floorPlan.name}"</Text>
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={() => setIsModalOpen(true)}
          disabled={workstations.length === 0} // Disable if workstations haven't loaded
        >
          Novo Objeto
        </Button>
      </Group>

      <Text c="dimmed" size="xs" mb="md">
        NOTA: Este é um editor em lista. A funcionalidade de arrastar e soltar
        será implementada futuramente.
      </Text>

      <Table.ScrollContainer minWidth={500}>
        <Table verticalSpacing="sm" striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Tipo</Table.Th>
              <Table.Th>Estação (se PDV)</Table.Th>
              <Table.Th>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? (
              rows
            ) : (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text ta="center">Nenhum objeto nesta planta</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <CreateVenueObjectModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          onRefresh(); // Refresh the list after creation
        }}
        floorPlanId={floorPlan.id}
        workstations={workstations}
      />
    </>
  );
}