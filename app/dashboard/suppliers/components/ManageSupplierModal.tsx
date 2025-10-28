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
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    },
    validate: {
      name: (value) => value.trim().length < 2 ? "Nome é obrigatório" : null,
      email: (value) => !value || /^\S+@\S+\.\S+$/.test(value) ? null : "Email inválido",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (supplierToEdit && opened) {
      form.setValues({
        name: supplierToEdit.name,
        contactPerson: supplierToEdit.contactPerson || "",
        phone: supplierToEdit.phone || "",
        email: supplierToEdit.email || "",
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
        contactPerson: values.contactPerson || null,
        phone: values.phone || null,
        email: values.email || null,
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
          <TextInput label="Pessoa de Contato" {...form.getInputProps("contactPerson")} />
          <TextInput label="Telefone" {...form.getInputProps("phone")} />
          <TextInput label="Email" type="email" {...form.getInputProps("email")} />
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
