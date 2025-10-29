// File: app/dashboard/floorplan/components/CreateVenueObjectModal.tsx
"use client";

import { Modal, Button, TextInput, Select, Group, NumberInput } from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { z } from "zod";
import { VenueObject, VenueObjectType, Workstation } from "@prisma/client";
import { ApiResponse } from "@/lib/types";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

// Zod schema for the object
const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.nativeEnum(VenueObjectType),
  workstationId: z.string().nullable().optional(),
  width: z.number().min(10),
  height: z.number().min(10),
  rotation: z.number(),
});

type Props = {
  opened: boolean;
  onClose: () => void;
  onSuccess: (object: VenueObject & { workstation: Workstation | null }) => void;
  floorPlanId: string;
  // Pass initial data for creation (from drop) or editing
  initialData?: Partial<VenueObject>;
};

// Fetch workstations to link
const fetchWorkstations = async (): Promise<Workstation[]> => {
  const res = await fetch("/api/workstations");
  const data: ApiResponse<Workstation[]> = await res.json();
  if (!data.success || !data.data) throw new Error("Failed to fetch workstations");
  return data.data;
};

export function CreateVenueObjectModal({
  opened,
  onClose,
  onSuccess,
  floorPlanId,
  initialData,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch workstation data for the dropdown
  const { data: workstations, isLoading: isLoadingWorkstations } = useQuery({
    queryKey: ["workstations"],
    queryFn: fetchWorkstations,
  });

  const form = useForm({
    initialValues: {
      name: "",
      // FIX 3: Explicitly type 'type' to allow any VenueObjectType
      type: VenueObjectType.OTHER as VenueObjectType,
      // FIX 1: Explicitly type workstationId to allow string or null
      workstationId: null as string | null,
      width: 100,
      height: 100,
      rotation: 0,
    },
    // FIX 2: Use 'as any' to bypass the Zod/Mantine type incompatibility
    validate: zodResolver(schema as any),
  });

  // When modal opens or initialData changes, populate the form
  useEffect(() => {
    if (initialData) {
      form.setValues({
        name: initialData.name || "",
        // This line now works
        type: initialData.type || VenueObjectType.TABLE,
        workstationId: initialData.workstationId || null,
        width: initialData.width || 100,
        height: initialData.height || 100,
        rotation: initialData.rotation || 0,
      });
    } else {
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, opened]); // form dependency removed to prevent loop

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);
    const isEditing = !!initialData?.id;

    const url = isEditing
      ? `/api/venue-objects/${initialData.id}`
      : "/api/venue-objects";

    // --- MISSION FIX: Changed 'PUT' to 'PATCH' ---
    const method = isEditing ? "PATCH" : "POST";
    // ---------------------------------------------

    const payload = {
      ...initialData,
      ...values,
      floorPlanId: floorPlanId,
    };

    try {
      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: ApiResponse<VenueObject & { workstation: Workstation | null }> =
        await res.json();

      if (data.success && data.data) {
        notifications.show({
          title: "Sucesso",
          message: `Objeto ${isEditing ? "atualizado" : "criado"} com sucesso!`,
          color: "green",
        });
        onSuccess(data.data);
      } else {
        throw new Error(data.error || "Falha ao salvar objeto");
      }
    } catch (error) {
      notifications.show({
        title: "Erro",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={initialData?.id ? "Editar Objeto" : "Criar Novo Objeto"}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          withAsterisk
          label="Nome do Objeto"
          placeholder="Ex: Mesa 1, Estoque Seco"
          {...form.getInputProps("name")}
        />
        <Select
          withAsterisk
          label="Tipo de Objeto"
          // --- FIX: Cast 'type' to string ---
          data={Object.values(VenueObjectType).map((type) => ({
            label: type as string,
            value: type as string,
          }))}
          // -----------------------------------
          {...form.getInputProps("type")}
        />
        <Select
          label="Estação de Trabalho Vinculada"
          placeholder="Selecione (se aplicável)"
          disabled={isLoadingWorkstations}
          data={workstations?.map((ws) => ({
            label: ws.name,
            value: ws.id,
          }))}
          clearable
          {...form.getInputProps("workstationId")}
        />
        <Group grow>
          <NumberInput label="Largura (px)" min={10} {...form.getInputProps("width")} />
          <NumberInput label="Altura (px)" min={10} {...form.getInputProps("height")} />
        </Group>
        <NumberInput label="Rotação (deg)" min={0} max={359} {...form.getInputProps("rotation")} />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Salvar
          </Button>
        </Group>
      </form>
    </Modal>
  );
}