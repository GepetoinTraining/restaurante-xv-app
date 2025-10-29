// PATH: app/dashboard/floorplan/components/VenueObjectEditor.tsx
"use client";

import { useState, useRef } from "react";
import {
  Paper,
  Grid,
  Box,
  LoadingOverlay,
  useMantineTheme,
  Text,
  useMantineColorScheme,
} from "@mantine/core";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useDroppable,
  UniqueIdentifier,
  Active,
} from "@dnd-kit/core";
import { notifications } from "@mantine/notifications";
import { FloorPlanPalette } from "./FloorPlanPalette";
import { DraggableVenueObject } from "./DraggableVenueObject";
import { FloorPlanWithObjects } from "./FloorPlanManager";
import { CreateVenueObjectModal } from "./CreateVenueObjectModal";
import { VenueObject, VenueObjectType, Workstation } from "@prisma/client";
import { ApiResponse } from "@/lib/types";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";

type Props = {
  floorPlan: FloorPlanWithObjects;
  onRefresh: () => void;
};

type FullVenueObject = VenueObject & { workstation: Workstation | null };

// 1. The Droppable Canvas Component
function FloorPlanCanvas({
  width,
  height,
  imageUrl,
  children,
}: {
  width: number;
  height: number;
  imageUrl?: string | null;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "floor-plan-canvas",
  });

  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  const background = imageUrl
    ? `url(${imageUrl})`
    : colorScheme === "dark"
    ? theme.colors.dark[7]
    : theme.colors.gray[1];

  return (
    <Paper
      ref={setNodeRef}
      shadow="inner"
      withBorder
      style={{
        width: width,
        height: height,
        position: "relative",
        background: background,
        backgroundSize: "cover",
        overflow: "hidden", // Clip objects
        borderStyle: isOver ? "dashed" : "solid",
        borderColor: isOver ? theme.colors.blue[5] : undefined,
      }}
    >
      {children}
    </Paper>
  );
}

// 2. The Main Editor
export function VenueObjectEditor({ floorPlan, onRefresh }: Props) {
  const [activeDragItem, setActiveDragItem] = useState<Active | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null); // Ref for coordinate calculation

  // Modal state
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [modalInitialData, setModalInitialData] = useState<
    Partial<FullVenueObject>
  >({});

  // API call to update an object
  const updateObjectPosition = async (
    id: string,
    newX: number,
    newY: number
  ) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/venue-objects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchorX: newX, anchorY: newY }),
      });
      if (!res.ok) throw new Error("Failed to update position");
      // No need to refresh, optimistic update already happened
      // We just need to trigger the parent's refresh
      onRefresh();
    } catch (error) {
      notifications.show({
        title: "Erro",
        message: "Falha ao salvar a nova posição.",
        color: "red",
      });
      // Revert change (by refreshing)
      onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  // API call to delete an object
  const deleteObject = async (id: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/venue-objects/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete object");
      notifications.show({
        title: "Sucesso",
        message: "Objeto excluído.",
        color: "green",
      });
      onRefresh(); // Refresh to show deletion
    } catch (error) {
      notifications.show({
        title: "Erro",
        message: "Falha ao excluir o objeto.",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open the confirmation modal for deletion
  const openDeleteModal = (object: FullVenueObject) => {
    modals.openConfirmModal({
      title: "Confirmar Exclusão",
      children: (
        <Text size="sm">
          Tem certeza que deseja excluir o objeto: <strong>{object.name}</strong>
          ?
        </Text>
      ),
      labels: { confirm: "Excluir", cancel: "Cancelar" },
      confirmProps: { color: "red" },
      onConfirm: () => deleteObject(object.id),
    });
  };

  // Handle drag start
  const handleDragStart = (event: { active: Active }) => {
    setActiveDragItem(event.active);
  };

  // Handle drag end (the core logic)
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over, delta } = event;

    // Not dropped on canvas, do nothing
    if (!over || over.id !== "floor-plan-canvas") return;

    const dragType = active.data.current?.type;

    if (dragType === "PALETTE_ITEM") {
      // --- CASE 1: Dropped a NEW item from the palette ---

      // Get canvas bounding box
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      // Calculate drop position relative to the canvas
      // 'event.activatorEvent' holds the initial MouseEvent/PointerEvent
      // We use its 'clientX/Y' as the starting point
      const startX = (event.activatorEvent as MouseEvent).clientX ?? 0;
      const startY = (event.activatorEvent as MouseEvent).clientY ?? 0;

      // Add the delta to get the final drop position
      const dropX = startX - canvasRect.left + delta.x;
      const dropY = startY - canvasRect.top + delta.y;

      const objectType = active.data.current?.objectType as VenueObjectType;
      const label = active.data.current?.label as string;

      // Pre-fill modal data
      setModalInitialData({
        name: `${label} (Novo)`,
        type: objectType,
        anchorX: Math.round(dropX),
        anchorY: Math.round(dropY),
        width: objectType === "TABLE" ? 100 : 150,
        height: objectType === "TABLE" ? 100 : 150,
      });
      openModal();
    } else if (dragType === "VENUE_OBJECT") {
      // --- CASE 2: Moved an EXISTING item ---
      const objectId = active.data.current?.objectId as string;
      const originalX = active.data.current?.originalX as number;
      const originalY = active.data.current?.originalY as number;

      const newX = Math.round(originalX + delta.x);
      const newY = Math.round(originalY + delta.y);

      // Optimistic UI update (feels faster)
      // The parent `floorPlan.objects` will update onRefresh

      // Call API to save new position
      updateObjectPosition(objectId, newX, newY);
    }
  };

  // Callback for when the modal saves
  const handleModalSuccess = (newObject: FullVenueObject) => {
    closeModal();
    onRefresh(); // Refresh the whole plan to show the new/edited object
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <Grid>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <FloorPlanPalette />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 9 }} ref={canvasRef}>
          <Box style={{ position: "relative" }}>
            <LoadingOverlay visible={isSubmitting} />
            <FloorPlanCanvas
              width={floorPlan.width}
              height={floorPlan.height}
              imageUrl={floorPlan.imageUrl}
            >
              {/* Render all existing objects */}
              {floorPlan.objects.map((obj) (
                <DraggableVenueObject
                  key={obj.id}
                  object={obj}
                  onEdit={() => {
                    setModalInitialData(obj);
                    openModal();
                  }}
                  onDelete={() => openDeleteModal(obj)}
                />
              ))}
            </FloorPlanCanvas>
          </Box>
        </Grid.Col>
      </Grid>

      {/* Drag overlay to show a preview while dragging */}
      <DragOverlay>
        {activeDragItem?.data.current?.type === "PALETTE_ITEM" && (
          <Paper p="xs" shadow="xl" bg="blue.1">
            <Text size="sm">{activeDragItem.data.current.label}</Text>
          </Paper>
        )}
        {activeDragItem?.data.current?.type === "VENUE_OBJECT" && (
          <Paper p="xs" shadow="xl" bg="green.1" style={{ opacity: 0.8 }}>
            <Text size="sm">
              {floorPlan.objects.find(
                (o) => o.id === activeDragItem.data.current?.objectId
              )?.name || "Objeto"}
            </Text>
          </Paper>
        )}
      </DragOverlay>

      {/* The modal for creating/editing */}
      <CreateVenueObjectModal
        opened={modalOpened}
        onClose={closeModal}
        onSuccess={handleModalSuccess}
        floorPlanId={floorPlan.id}
        initialData={modalInitialData}
      />
    </DndContext>
  );
}