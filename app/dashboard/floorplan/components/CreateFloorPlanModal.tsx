// PATH: app/dashboard/floorplan/components/CreateFloorPlanModal.tsx
"use client";

import { Modal, Button, TextInput, NumberInput, Group } from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { z } from "zod";
import { FloorPlan } from "@prisma/client";
import { ApiResponse } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  width: z.number().min(100, "Largura mínima é 100"),
  height: z.number().min(100, "Altura mínima é 100"),
});

type Props = {
  opened: boolean;
  onClose: () => void;
  onSuccess: (newPlan: FloorPlan) => void;
};

export function CreateFloorPlanModal({ opened, onClose, onSuccess }: Props) {
  const form = useForm({
    initialValues: {
      name: "",
      width: 1000,
      height: 800,
    },
    validate: zodResolver(schema),
  });

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const res = await fetch("/api/floorplans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data: ApiResponse<FloorPlan> = await res.json();

      if (data.success && data.data) {
        notifications.show({
          title: "Sucesso",
          message: "Planta baixa criada com sucesso!",
          color: "green",
        });
        onSuccess(data.data);
        form.reset();
      } else {
        throw new Error(data.error || "Falha ao criar planta");
      }
    } catch (error) {
      notifications.show({
        title: "Erro",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        color: "red",
      });
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Criar Nova Planta Baixa">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <TextInput
          withAsterisk
          label="Nome da Planta"
          placeholder="Ex: Cozinha, Salão Principal"
          {...form.getInputProps("name")}
        />
        <NumberInput
          withAsterisk
          label="Largura (px)"
          min={100}
          step={50}
          {...form.getInputProps("width")}
        />
        <NumberInput
          withAsterisk
          label="Altura (px)"
          min={100}
          step={50}
          {...form.getInputProps("height")}
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={form.isSubmitting()}>
            Salvar
          </Button>
        </Group>
      </form>
    </Modal>
  );
}