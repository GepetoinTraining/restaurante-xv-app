// PATH: app/dashboard/suppliers/page.tsx
'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { Supplier } from "@prisma/client";
import { PageHeader } from "../components/PageHeader";
import { SupplierTable } from "./components/SupplierTable";
import { ManageSupplierModal } from "./components/ManageSupplierModal";
import { Button, Alert, LoadingOverlay, Box, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconExclamationCircle } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { ApiResponse, ErrorResponse } from "@/lib/types"; // Assuming ErrorResponse is in lib/types

// Create a client
const queryClient = new QueryClient();

function SuppliersPageContent() {
  const queryClientInstance = useQueryClient();
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

  // Fetch all suppliers
  const { data: suppliers, isLoading, isError, error } = useQuery<Supplier[], AxiosError<ErrorResponse>>({
    queryKey: ['suppliers'],
    queryFn: () => axios.get('/api/suppliers').then(res => res.data),
  });

  // Mutation for creating/updating a supplier
  const { mutate: saveSupplier, isPending: isSaving } = useMutation<
    Supplier,
    AxiosError<ErrorResponse>,
    Partial<Supplier>
  >({
    mutationFn: (supplierData) => {
      const url = supplierToEdit ? `/api/suppliers/${supplierToEdit.id}` : '/api/suppliers';
      const method = supplierToEdit ? 'PUT' : 'POST';
      return axios({ url, method, data: supplierData }).then(res => res.data);
    },
    onSuccess: (data) => {
      notifications.show({
        title: supplierToEdit ? 'Fornecedor Atualizado' : 'Fornecedor Criado',
        message: `O fornecedor "${data.name}" foi salvo com sucesso.`,
        color: 'green',
      });
      queryClientInstance.invalidateQueries({ queryKey: ['suppliers'] });
      closeModal();
      setSupplierToEdit(null);
    },
    onError: (error) => {
      notifications.show({
        title: 'Erro ao salvar',
        message: error.response?.data?.error || 'Não foi possível salvar o fornecedor.',
        color: 'red',
        icon: <IconExclamationCircle />,
      });
    },
  });

  // Mutation for deleting a supplier
  const { mutate: deleteSupplier, isPending: isDeleting } = useMutation<
    ApiResponse,
    AxiosError<ErrorResponse>,
    string // The mutation itself still correctly expects a string (the ID)
  >({
    mutationFn: (id) => axios.delete(`/api/suppliers/${id}`).then(res => res.data),
    onSuccess: () => {
      notifications.show({
        title: 'Fornecedor Excluído',
        message: 'O fornecedor foi excluído com sucesso.',
        color: 'green',
      });
      queryClientInstance.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (error) => {
      notifications.show({
        title: 'Erro ao excluir',
        message: error.response?.data?.error || 'Não foi possível excluir o fornecedor.',
        color: 'red',
        icon: <IconExclamationCircle />,
      });
    },
  });

  // --- Handlers ---
  const handleOpenCreateModal = () => {
    setSupplierToEdit(null);
    openModal();
  };

  const handleOpenEditModal = (supplier: Supplier) => {
    setSupplierToEdit(supplier);
    openModal();
  };

  // --- FIX: Changed parameter from 'id: string' to 'supplier: Supplier' ---
  const handleDeleteClick = (supplier: Supplier) => {
    modals.openConfirmModal({
      title: 'Confirmar Exclusão',
      children: (
        <Text size="sm">
          Tem certeza que deseja excluir o fornecedor "{supplier.name}"? Esta
          ação não pode ser desfeita.
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      // --- FIX: Pass the 'supplier.id' to the mutation ---
      onConfirm: () => deleteSupplier(supplier.id),
    });
  };

  const handleSubmit = (data: Partial<Supplier>) => {
    saveSupplier(data);
  };

  return (
    <>
      <PageHeader
        title="Fornecedores"
        actionButton={
          <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreateModal}>
            Novo Fornecedor
          </Button>
        }
      />
      <Box pos="relative" mt="md">
        <LoadingOverlay visible={isLoading || isDeleting} />
        {isError && (
          <Alert color="red" title="Erro ao carregar" icon={<IconExclamationCircle />}>
            {error.response?.data?.error || "Não foi possível carregar os fornecedores."}
          </Alert>
        )}
        {!isLoading && !isError && (
          <SupplierTable
            suppliers={suppliers || []}
            onEdit={handleOpenEditModal}
            // This prop now correctly matches the function signature
            onDelete={handleDeleteClick}
          />
        )}
      </Box>
      <ManageSupplierModal
        opened={modalOpened}
        onClose={closeModal}
        onSubmit={handleSubmit}
        supplierToEdit={supplierToEdit}
        isLoading={isSaving}
      />
    </>
  );
}

// Export the page wrapped in the QueryClientProvider
export default function SuppliersPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuppliersPageContent />
    </QueryClientProvider>
  );
}