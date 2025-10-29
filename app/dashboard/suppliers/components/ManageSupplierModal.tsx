// PATH: app/dashboard/suppliers/components/ManageSupplierModal.tsx
"use client";

import { useEffect } from "react";
import {
  Modal,
  TextInput,
  Button,
  Stack,
  LoadingOverlay,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Supplier } from "@prisma/client";

interface ManageSupplierModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Supplier>) => void;
  supplierToEdit: Supplier | null;
  isLoading: boolean;
}

export function ManageSupplierModal({
  opened,
  onClose,
  onSubmit,
  supplierToEdit,
  isLoading,
}: ManageSupplierModalProps) {

  const form = useForm({
    initialValues: {
      name: "",
      // --- FIX: Use correct field names ---
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      // ----------------------------------
      address: "",
      notes: "",
    },
    validate: {
      name: (value) => value.trim().length < 2 ? "Nome é obrigatório" : null,
      // --- FIX: Use correct field name ---
      contactEmail: (value) => !value || /^\S+@\S+\.\S+$/.test(value) ? null : "Email inválido",
      // ---------------------------------
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (supplierToEdit && opened) {
      form.setValues({
        name: supplierToEdit.name,
        // --- FIX: Use correct field names ---
        contactName: supplierToEdit.contactName || "",
        contactPhone: supplierToEdit.contactPhone || "",
        contactEmail: supplierToEdit.contactEmail || "",
        // ----------------------------------
        address: supplierToEdit.address || "",
        notes: supplierToEdit.notes || "",
      });
    } else if (!opened) {
      form.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierToEdit, opened]);

  const handleFormSubmit = (values: typeof form.values) => {
    // Only pass non-empty values or values suitable for the DB
    const payload: Partial<Supplier> = {
        name: values.name,
        // --- FIX: Use correct field names ---
        contactName: values.contactName || null,
        contactPhone: values.contactPhone || null,
        contactEmail: values.contactEmail || null,
        // ----------------------------------
        address: values.address || null,
        notes: values.notes || null,
    };
    onSubmit(payload);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
        opened={opened}
        onClose={handleClose}
        title={supplierToEdit ? "Editar Fornecedor" : "Novo Fornecedor"}
        size="md"
    >
      <LoadingOverlay visible={isLoading} />
      <form onSubmit={form.onSubmit(handleFormSubmit)}>
        <Stack>
          <TextInput required label="Nome do Fornecedor" {...form.getInputProps("name")} />
          {/* --- FIX: Use correct field names --- */}
          <TextInput label="Pessoa de Contato" {...form.getInputProps("contactName")} />
          <TextInput label="Telefone" {...form.getInputProps("contactPhone")} />
          <TextInput label="Email" type="email" {...form.getInputProps("contactEmail")} />
          {/* ---------------------------------- */}
          <Textarea label="Endereço" {...form.getInputProps("address")} />
          <Textarea label="Notas" placeholder="Condições de pagamento, dias de entrega..." {...form.getInputProps("notes")} />

          <Button type="submit" mt="md" loading={isLoading}>
            {supplierToEdit ? "Salvar Alterações" : "Criar Fornecedor"}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}