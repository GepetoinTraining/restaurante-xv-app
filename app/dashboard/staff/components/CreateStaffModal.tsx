// PATH: app/dashboard/staff/components/CreateStaffModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  TextInput,
  PasswordInput,
  Button,
  Select,
  Stack,
  LoadingOverlay,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { Role, Workstation } from "@prisma/client"; // Import Role and Workstation
import { ApiResponse } from "@/lib/types";

interface CreateStaffModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Data for the Role select input
const roleData = [
  { value: Role.SERVER, label: "Garçom" },
  { value: Role.BARTENDER, label: "Bartender" },
  { value: Role.COOK, label: "Cozinha" },
  { value: Role.CASHIER, label: "Caixa" },
  { value: Role.DJ, label: "DJ" },
  { value: Role.MANAGER, label: "Gerente" },
  { value: Role.OWNER, label: "Proprietário" },
];

export function CreateStaffModal({
  opened,
  onClose,
  onSuccess,
}: CreateStaffModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);

  const form = useForm({
    initialValues: {
      name: "",
      email: "",
      pin: "",
      confirmPin: "",
      role: Role.SERVER,
      workstationId: null, // ID of the workstation (not the venueObject)
    },
    validate: {
      name: (value) =>
        value.trim().length < 2 ? "Nome deve ter pelo menos 2 caracteres" : null,
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Email inválido"),
      pin: (value) =>
        /^\d{4,6}$/.test(value)
          ? null
          : "PIN deve ter entre 4 e 6 dígitos numéricos",
      confirmPin: (value, values) =>
        value !== values.pin ? "PINs não conferem" : null,
      role: (value) => (value ? null : "Função é obrigatória"),
    },
  });

  // Fetch available workstations to assign
  useEffect(() => {
    const fetchWorkstations = async () => {
      try {
        // We need a new API route to fetch workstations.
        // As a temporary measure, we'll just leave it empty.
        // We will create /api/workstations later.
        // This is a known dependency on Chunk 2.
        
        // const response = await fetch("/api/workstations");
        // const data: ApiResponse<Workstation[]> = await response.json();
        // if (data.success && data.data) {
        //   setWorkstations(data.data);
        // }
      } catch (error) {
        console.error("Failed to fetch workstations", error);
      }
    };

    if (opened) {
      // fetchWorkstations(); // Disabled for now
    }
  }, [opened]);

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          pin: values.pin,
          role: values.role,
          workstationId: values.workstationId, // Pass the ID (will be null for now)
        }),
      });

      const data: ApiResponse = await response.json();

      if (response.ok && data.success) {
        notifications.show({
          title: "Sucesso",
          message: "Membro da equipe criado com sucesso!",
          color: "green",
        });
        form.reset();
        onSuccess();
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao criar membro da equipe",
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
    <Modal opened={opened} onClose={handleClose} title="Novo Membro da Equipe">
      <LoadingOverlay visible={isSubmitting} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            required
            label="Nome"
            placeholder="Nome completo"
            {...form.getInputProps("name")}
          />
          <TextInput
            required
            label="Email"
            placeholder="email@dominio.com"
            {...form.getInputProps("email")}
          />
          <Select
            required
            label="Função"
            data={roleData}
            {...form.getInputProps("role")}
          />
          <PasswordInput
            required
            label="PIN"
            placeholder="PIN de 4-6 dígitos"
            {...form.getInputProps("pin")}
          />
          <PasswordInput
            required
            label="Confirmar PIN"
            placeholder="Repita o PIN"
            {...form.getInputProps("confirmPin")}
          />

          {/* NOTE: Workstation assignment is disabled for now.
            We first need to implement Chunk 2 (Venue & Inventory)
            to create Workstations (as VenueObjects) before we can assign
            staff to them.
          */}
          <Select
            label="Estação de Trabalho"
            placeholder="Será habilitado após cadastro de estações"
            data={workstations.map((w) => ({ value: w.id, label: w.name }))}
            {...form.getInputProps("workstationId")}
            disabled // Disabled for now
            clearable
          />

          <Button type="submit" mt="md">
            Salvar
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}