// PATH: app/dashboard/clients/components/CreateClientModal.tsx
// NOTE: This file should be fine as-is from the old codebase,
// but here is the refactored version just in case.

"use client";

import { useState } from "react";
import {
  Modal,
  TextInput,
  Button,
  Stack,
  LoadingOverlay,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { ApiResponse } from "@/lib/types";
import { Client } from "@prisma/client";

interface CreateClientModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateClientModal({
  opened,
  onClose,
  onSuccess,
}: CreateClientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      name: "",
      phone: "",
      email: "",
      cpf: "",
    },
    validate: {
      name: (value) =>
        value.trim().length < 2 ? "Nome é obrigatório" : null,
      phone: (value) =>
        /^\d{10,11}$/.test(value)
          ? null
          : "Telefone inválido (10-11 dígitos)",
      email: (value) =>
        !value || /^\S+@\S+$/.test(value) ? null : "Email inválido",
      cpf: (value) =>
        !value || /^\d{11}$/.test(value) ? null : "CPF inválido (11 dígitos)",
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data: ApiResponse<Client> = await response.json();

      if (response.ok && data.success) {
        notifications.show({
          title: "Sucesso",
          message: "Cliente criado com sucesso!",
          color: "green",
        });
        form.reset();
        onSuccess();
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao criar cliente",
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
    <Modal opened={opened} onClose={handleClose} title="Novo Cliente">
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
            label="Telefone (com DDD)"
            placeholder="47999887766"
            {...form.getInputProps("phone")}
          />
          <TextInput
            label="Email (Opcional)"
            placeholder="email@dominio.com"
            {...form.getInputProps("email")}
          />
          <TextInput
            label="CPF (Opcional)"
            placeholder="12345678900"
            {...form.getInputProps("cpf")}
          />
          <Button type="submit" mt="md">
            Salvar
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}