// PATH: app/dashboard/floorplan/components/CreateVenueObjectModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  TextInput,
  Button,
  NumberInput,
  Stack,
  LoadingOverlay,
  Select,
  Switch,
  Text, // Ensure Text is imported
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { ApiResponse } from "@/lib/types";
import { VenueObject, VenueObjectType, Workstation } from "@prisma/client";
// Removed unused Decimal import

interface CreateVenueObjectModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  floorPlanId: string;
  workstations: Workstation[]; // Pass workstations for the 'WORKSTATION' type
}

// Data for the Select component
const objectTypeData = Object.values(VenueObjectType).map(value => ({
    value,
    label: value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}));


// Array of storage types
const storageTypes: VenueObjectType[] = [
    VenueObjectType.STORAGE,
    VenueObjectType.FREEZER,
    VenueObjectType.SHELF,
    VenueObjectType.WORKSTATION_STORAGE
];

export function CreateVenueObjectModal({
  opened,
  onClose,
  onSuccess,
  floorPlanId,
  workstations,
}: CreateVenueObjectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      name: "",
      type: VenueObjectType.TABLE as VenueObjectType, // Assert broader type initially
      workstationId: null as string | null,
      capacity: 2 as number | '',
      isReservable: false,
      reservationCost: 0 as number | '',
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : "Nome é obrigatório"),
      type: (value) => (value ? null : "Tipo é obrigatório"),
      // FIX 1: Explicitly cast type for comparison
      workstationId: (value, values) =>
        (values.type as VenueObjectType) === VenueObjectType.WORKSTATION && !value
          ? "Estação é obrigatória para este tipo"
          : null,
      // ---- START FIX for build error ----
      capacity: (val, values) => {
           const currentType = values.type as VenueObjectType; // Get the type
           // Check if the type is NOT TABLE and NOT BAR_SEAT
           if (currentType !== VenueObjectType.TABLE && currentType !== VenueObjectType.BAR_SEAT) {
               return null; // Capacity validation doesn't apply
           }
           // Existing validation logic for TABLE or BAR_SEAT
           if (val === null || val === '') return "Capacidade é obrigatória para este tipo";
           const num = Number(val);
           return isNaN(num) || num < 1 ? "Capacidade deve ser 1 ou maior" : null;
      },
      // ---- END FIX for build error ----
      reservationCost: (val, values) => {
           // FIX: Cast values.type here
           if ((values.type as VenueObjectType) !== VenueObjectType.TABLE || !values.isReservable) return null;
           if (val === null || val === '') return "Custo é obrigatório para reserva";
           const num = Number(val);
           return isNaN(num) || num < 0 ? "Custo deve ser um número positivo ou zero" : null;
      },
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!opened) {
      form.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);


  // Get workstation data for the Select
  const workstationSelectData = workstations.map((w) => ({
    value: w.id,
    label: w.name,
  }));

  // Get current form values
  const formValues = form.values;

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);
    try {
        const currentType = values.type as VenueObjectType; // Cast for checks
        const payload = {
            name: values.name,
            floorPlanId: floorPlanId,
            type: currentType,
            anchorX: 0,
            anchorY: 0,
            // Check type directly for capacity inclusion
            capacity: (currentType === VenueObjectType.TABLE || currentType === VenueObjectType.BAR_SEAT) && values.capacity !== '' ? Number(values.capacity) : null,
            isReservable: currentType === VenueObjectType.TABLE ? values.isReservable : false,
            reservationCost: (currentType === VenueObjectType.TABLE && values.isReservable && values.reservationCost !== '') ? Number(values.reservationCost).toString() : null,
            workstationId: currentType === VenueObjectType.WORKSTATION ? values.workstationId : null,
        };

      const response = await fetch("/api/venue-objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: ApiResponse<VenueObject> = await response.json();

      if (response.ok && data.success) {
        notifications.show({
          title: "Sucesso",
          message: "Objeto criado com sucesso!",
          color: "green",
        });
        onSuccess();
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao criar objeto",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
      notifications.show({
        title: "Erro",
        message: "Ocorreu um erro inesperado",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  // FIX 2: Explicitly cast type for includes check
  const isStorageType = storageTypes.includes(formValues.type as VenueObjectType);
  // END FIX 2

  return (
    <Modal opened={opened} onClose={handleClose} title="Novo Objeto na Planta">
      <LoadingOverlay visible={isSubmitting} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            required
            label="Nome / Identificador"
            placeholder="Ex: Mesa 12, Bar 01, Freezer Cozinha"
            {...form.getInputProps("name")}
          />
          <Select
            required
            label="Tipo de Objeto"
            data={objectTypeData}
            {...form.getInputProps("type")}
            // FIX 3: Ensure value passed is string and handle potential null
            onChange={(value) => {
                 const selectedType = value as VenueObjectType | null;
                 form.setFieldValue('type', selectedType ?? VenueObjectType.TABLE);
                 if (selectedType !== VenueObjectType.WORKSTATION) {
                     form.setFieldValue('workstationId', null);
                 }
                 // Check type directly
                 if (!selectedType || (selectedType !== VenueObjectType.TABLE && selectedType !== VenueObjectType.BAR_SEAT)) {
                     form.setFieldValue('capacity', '');
                 }
                 if (selectedType !== VenueObjectType.TABLE) {
                     form.setFieldValue('isReservable', false);
                     form.setFieldValue('reservationCost', '');
                 }
            }}
            // END FIX 3
          />

          {/* Conditional Fields based on Type */}

          {/* FIX: Cast formValues.type */}
          {(formValues.type as VenueObjectType) === VenueObjectType.WORKSTATION && (
            <Select
              required
              label="Estação de Trabalho Vinculada"
              description="Qual estação este objeto representa?"
              placeholder="Selecione a estação"
              data={workstationSelectData}
              {...form.getInputProps("workstationId")}
              searchable
            />
          )}

          {/* Check type directly */}
          {(formValues.type === VenueObjectType.TABLE || formValues.type === VenueObjectType.BAR_SEAT) && (
            <NumberInput
              required
              label="Capacidade (lugares)"
              placeholder="2"
              min={1}
              step={1}
              allowDecimal={false}
              {...form.getInputProps("capacity")}
            />
          )}

          {/* FIX: Cast formValues.type */}
           {(formValues.type as VenueObjectType) === VenueObjectType.TABLE && (
            <>
                <Switch
                  label="Pode ser reservado?"
                  {...form.getInputProps('isReservable', { type: 'checkbox' })}
                  mt="sm"
                  onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      form.setFieldValue('isReservable', checked);
                      if (!checked) {
                          form.setFieldValue('reservationCost', '');
                      }
                  }}
                />
                {formValues.isReservable && (
                 <NumberInput
                    required
                    label="Custo da Reserva (R$)"
                    placeholder="0.00"
                    decimalScale={2}
                    fixedDecimalScale
                    min={0}
                    step={0.01}
                    {...form.getInputProps('reservationCost')}
                    mt="xs"
                 />
               )}
            </>
           )}

            {isStorageType && (
                <Text size="sm" c="dimmed" mt="sm">Este objeto será usado como local de estoque.</Text>
            )}

          <Button type="submit" mt="xl" loading={isSubmitting}>
            Salvar Objeto
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}