// PATH: app/dashboard/dj/components/CreateEventModal.tsx
// NOTE: This is a NEW FILE.

"use client";

import { useState } from "react";
import {
  Modal,
  Button,
  Stack,
  LoadingOverlay,
  Select,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import "dayjs/locale/pt-br";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { ApiResponse } from "@/lib/types";
import { SerializedEntertainer } from "./ScheduleManager";

interface CreateEventModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entertainers: SerializedEntertainer[];
}

export function CreateEventModal({
  opened,
  onClose,
  onSuccess,
  entertainers,
}: CreateEventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      entertainerId: null as string | null,
      startTime: new Date(),
      endTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
    },
    validate: {
      entertainerId: (value) => (value ? null : "Artista é obrigatório"),
      startTime: (value) => (value ? null : "Início é obrigatório"),
      endTime: (value, values) =>
        value && values.startTime && value > values.startTime
          ? null
          : "Fim deve ser após o início",
    },
  });

  const entertainerData = entertainers.map((e) => ({
    value: e.id,
    label: `${e.name} (${e.type})`,
  }));

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          startTime: values.startTime.toISOString(),
          endTime: values.endTime.toISOString(),
        }),
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.success) {
        notifications.show({
          title: "Sucesso",
          message: "Evento agendado com sucesso!",
          color: "green",
        });
        form.reset();
        onSuccess();
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao agendar evento",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Agendar Evento">
      <LoadingOverlay visible={isSubmitting} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Select
            required
            label="Artista"
            placeholder="Selecione o artista ou DJ"
            data={entertainerData}
            {...form.getInputProps("entertainerId")}
            searchable
          />
          <DateTimePicker
            required
            locale="pt-br"
            label="Início do Evento"
            {...form.getInputProps("startTime")}
          />
          <DateTimePicker
            required
            locale="pt-br"
            label="Fim do Evento"
            {...form.getInputProps("endTime")}
          />
          <Button type="submit" mt="md">
            Salvar
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}