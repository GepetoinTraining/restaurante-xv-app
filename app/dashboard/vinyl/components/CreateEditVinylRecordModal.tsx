// PATH: app/dashboard/vinyl/components/CreateEditVinylRecordModal.tsx
// Refactored component (was vynil/components/CreateEditVinylRecordModal.tsx)

"use client";

import { useState } from "react";
import {
  Modal,
  TextInput,
  Button,
  NumberInput,
  Stack,
  LoadingOverlay,
  Select,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { ApiResponse } from "@/lib/types";
import { VinylLibrarySlot } from "@prisma/client";

interface CreateEditVinylRecordModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  slots: VinylLibrarySlot[]; // Pass in available slots
}

export function CreateEditVinylRecordModal({
  opened,
  onClose,
  onSuccess,
  slots,
}: CreateEditVinylRecordModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const isEditing = !!record; // For editing later

  const form = useForm({
    initialValues: {
      title: "",
      artist: "",
      genre: "",
      year: null as number | null,
      imageUrl: "",
      slotId: "", // New field
      positionInSlot: 1, // New field
    },
    validate: {
      title: (value) => (value.trim() ? null : "Título é obrigatório"),
      artist: (value) => (value.trim() ? null : "Artista é obrigatório"),
      slotId: (value) => (value ? null : "Slot é obrigatório"),
      positionInSlot: (value) =>
        value > 0 ? null : "Posição deve ser 1 ou maior",
    },
  });

  // Format slots data for the Select component
  const slotData = slots.map((slot) => ({
    value: slot.id,
    label: `Slot: Linha ${slot.row} / Coluna ${slot.column} (Cap: ${slot.capacity})`,
  }));

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);
    try {
      // TODO: Add PUT logic for editing
      const response = await fetch("/api/vinyl-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.success) {
        notifications.show({
          title: "Sucesso",
          message: "Disco salvo com sucesso!",
          color: "green",
        });
        form.reset();
        onSuccess();
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao salvar disco",
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
    form.reset();
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title={"Novo Disco"}>
      <LoadingOverlay visible={isSubmitting} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Select
            required
            label="Slot (Prateleira)"
            placeholder="Selecione onde o disco será guardado"
            data={slotData}
            {...form.getInputProps("slotId")}
            searchable
          />
          <NumberInput
            required
            label="Posição no Slot"
            placeholder="1"
            min={1}
            {...form.getInputProps("positionInSlot")}
          />
          <TextInput
            required
            label="Título"
            placeholder="Título do Álbum"
            {...form.getInputProps("title")}
          />
          <TextInput
            required
            label="Artista"
            placeholder="Nome do Artista"
            {...form.getInputProps("artist")}
          />
          <TextInput
            label="Gênero"
            placeholder="Ex: Rock, Eletrônica"
            {...form.getInputProps("genre")}
          />
          <NumberInput
            label="Ano"
            placeholder="1990"
            min={1900}
            max={new Date().getFullYear()}
            allowDecimal={false}
            {...form.getInputProps("year")}
          />
          <TextInput
            label="URL da Imagem (Capa)"
            placeholder="https://"
            {...form.getInputProps("imageUrl")}
          />
          <Button type="submit" mt="md">
            Salvar
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}