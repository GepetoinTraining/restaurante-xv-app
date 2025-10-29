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
  // 1. Import useMantineColorScheme
  useMantineColorScheme,
} from "@mantine/core";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useDroppable,
  UniqueIdentifier,
  Active,
  // 2. Import DragStartEvent
  DragStartEvent,
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
  // 3. Get color scheme from the hook
  const { colorScheme } = useMantineColorScheme();

  const background = imageUrl
    ? `url(${imageUrl})`
    // 4. Use the colorScheme variable
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
  const canvasRef = useRef<HTMLDivElement>(null);

  // 5. State to store drag start coordinates
  const [dragStartCoords, setDragStartCoords] = useState<{
    x: number;
    y: number;
  } | null>(null);

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
      onRefresh();
    } catch (error) {
      notifications.show({
        title: "Erro",
        message: "Falha ao salvar a nova posição.",
        color: "red",
      });
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
      onRefresh();
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

  // 6. Handle drag start (using 'as any' to bypass type error)
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active);
    
    // --- FIX: Cast to 'any' to bypass complex event type ---
    const activatorEvent = event.activatorEvent as any; 

    // Check if it's a TouchEvent
    if (activatorEvent && activatorEvent.touches) {
      setDragStartCoords({
        x: activatorEvent.touches[0].clientX,
        y: activatorEvent.touches[0].clientY,
      });
    } 
    // Check if it's a MouseEvent
    else if (activatorEvent && activatorEvent.clientX !== undefined) {
      setDragStartCoords({
        x: activatorEvent.clientX,
        y: activatorEvent.clientY,
      });
    }
  };

  // 7. Handle drag end (using coordinates from state)
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over, delta } = event;

    // Get coords from state and reset
    const startCoords = dragStartCoords;
    setDragStartCoords(null);

    // Not dropped on canvas, do nothing
    if (!over || over.id !== "floor-plan-canvas") return;

    const dragType = active.data.current?.type;

    if (dragType === "PALETTE_ITEM") {
      // --- CASE 1: Dropped a NEW item from the palette ---
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      
      // Check for canvasRect AND startCoords
      if (!canvasRect || !startCoords) return;

      // Calculate drop position relative to the canvas
      const dropX = startCoords.x - canvasRect.left + delta.x;
      const dropY = startCoords.y - canvasRect.top + delta.y;

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

      updateObjectPosition(objectId, newX, newY);
    }
  };

  // Callback for when the modal saves
  const handleModalSuccess = (newObject: FullVenueObject) => {
    closeModal();
    onRefresh();
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
              {floorPlan.objects.map((obj) => (
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