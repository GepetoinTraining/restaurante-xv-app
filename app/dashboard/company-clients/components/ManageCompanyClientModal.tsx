// PATH: app/dashboard/company-clients/components/ManageCompanyClientModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  TextInput,
  Button,
  Stack,
  LoadingOverlay,
  NumberInput,
  Select,
  Textarea,
  Group
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { CompanyClient, SalesPipelineStage } from "@prisma/client"; // Use Prisma type for editing
import { SerializedCompanyClientWithId } from "./CompanyClientTable"; // Import serialized type for editing

interface ManageCompanyClientModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void; // Function to handle form submission (POST or PATCH)
  clientToEdit: SerializedCompanyClientWithId | null; // Pass client data for editing
  isLoading: boolean; // Loading state from parent mutation
}

// Data for SalesPipelineStage select
const salesStageOptions = Object.values(SalesPipelineStage).map(stage => ({
    value: stage,
    label: stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) // Basic formatting
}));

export function ManageCompanyClientModal({
  opened,
  onClose,
  onSubmit,
  clientToEdit,
  isLoading,
}: ManageCompanyClientModalProps) {

  const form = useForm({
    initialValues: {
      companyName: "",
      phone: "",
      contactPerson: "",
      email: "",
      addressStreet: "",
      addressCity: "",
      addressState: "",
      addressZip: "",
      employeeCount: '' as number | '',
      consumptionFactor: '1.0', // Default as string
      salesPipelineStage: SalesPipelineStage.LEAD,
      notes: "",
    },
    validate: {
      companyName: (value) => value.trim().length < 2 ? "Nome da empresa é obrigatório" : null,
      phone: (value) => /^\d{10,15}$/.test(value.replace(/\D/g, '')) ? null : "Telefone inválido (10-15 dígitos)", // Allow more digits/formats
      email: (value) => !value || /^\S+@\S+\.\S+$/.test(value) ? null : "Email inválido",
      employeeCount: (value) => (value !== '' && (isNaN(Number(value)) || Number(value) < 0)) ? "Número inválido" : null,
      consumptionFactor: (value) => {
          try {
              const num = parseFloat(value);
              return !isNaN(num) && num >= 0 ? null : "Fator inválido (>= 0)";
          } catch { return "Formato inválido"; }
      },
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (clientToEdit && opened) {
      form.setValues({
        companyName: clientToEdit.companyName,
        phone: clientToEdit.phone,
        contactPerson: clientToEdit.contactPerson || "",
        email: clientToEdit.email || "",
        addressStreet: clientToEdit.addressStreet || "",
        addressCity: clientToEdit.addressCity || "",
        addressState: clientToEdit.addressState || "",
        addressZip: clientToEdit.addressZip || "",
        employeeCount: clientToEdit.employeeCount ?? '', // Use empty string for null
        consumptionFactor: clientToEdit.consumptionFactor, // Already a string
        salesPipelineStage: clientToEdit.salesPipelineStage,
        notes: clientToEdit.notes || "",
      });
    } else if (!opened) {
      form.reset(); // Reset form when modal closes
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientToEdit, opened]);

  const handleFormSubmit = (values: typeof form.values) => {
    // Convert necessary fields before submitting
    const payload = {
        ...values,
        employeeCount: values.employeeCount !== '' ? Number(values.employeeCount) : null,
        // consumptionFactor is already string
    };
    onSubmit(payload);
  };

  const handleClose = () => {
    // form.reset(); // Resetting in useEffect on close
    onClose();
  };

  return (
    <Modal
        opened={opened}
        onClose={handleClose}
        title={clientToEdit ? "Editar Cliente B2B" : "Novo Cliente B2B"}
        size="lg"
    >
      <LoadingOverlay visible={isLoading} />
      <form onSubmit={form.onSubmit(handleFormSubmit)}>
        <Stack>
          <TextInput required label="Nome da Empresa" {...form.getInputProps("companyName")} />
          <TextInput required label="Telefone Principal" placeholder="(XX) XXXXX-XXXX" {...form.getInputProps("phone")} />
          <TextInput label="Pessoa de Contato" {...form.getInputProps("contactPerson")} />
          <TextInput label="Email Contato" type="email" {...form.getInputProps("email")} />

          <Group grow>
            <NumberInput label="Nº Funcionários" placeholder="100" min={0} allowDecimal={false} {...form.getInputProps("employeeCount")} />
            <NumberInput label="Fator Consumo" description="Ex: 1.2 (come 20% a mais)" placeholder="1.0" min={0} step={0.1} decimalScale={2} {...form.getInputProps("consumptionFactor")} />
          </Group>

          <Select
            label="Estágio da Venda"
            data={salesStageOptions}
            {...form.getInputProps("salesPipelineStage")}
          />

          <TextInput label="Endereço (Rua, Nº)" {...form.getInputProps("addressStreet")} />
          <Group grow>
            <TextInput label="Cidade" {...form.getInputProps("addressCity")} />
            <TextInput label="Estado (UF)" maxLength={2} {...form.getInputProps("addressState")} />
            <TextInput label="CEP" placeholder="XXXXX-XXX" {...form.getInputProps("addressZip")} />
          </Group>

          <Textarea label="Notas Internas" placeholder="Detalhes, preferências..." {...form.getInputProps("notes")} />

          <Button type="submit" mt="md" loading={isLoading}>
            {clientToEdit ? "Salvar Alterações" : "Criar Cliente"}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
