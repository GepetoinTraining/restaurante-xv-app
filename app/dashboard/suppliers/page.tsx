// PATH: app/dashboard/suppliers/page.tsx
"use client";

import { useState } from "react";
import { Button, Container, Stack, Alert } from "@mantine/core";
import { IconPlus, IconAlertCircle } from "@tabler/icons-react";
import { PageHeader } from "../components/PageHeader";
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Supplier } from "@prisma/client";
import { SupplierTable } from "./components/SupplierTable";
import { ManageSupplierModal } from "./components/ManageSupplierModal";

// Create a client for react-query
const queryClient = new QueryClient();

// Wrapper Component
export default function SuppliersPageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuppliersPage />
    </QueryClientProvider>
  );
}

// Main Page Component
function SuppliersPage() {
    const internalQueryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

    // Fetch Suppliers
    const {
        data: suppliers,
        isLoading,
        isError,
        error,
        refetch
    } = useQuery<Supplier[]>({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const res = await fetch("/api/suppliers");
            const result: ApiResponse<Supplier[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar fornecedores");
            return result.data ?? [];
        },
    });

    // --- Mutations ---
    const mutation = useMutation<Supplier, Error, { method: 'POST' | 'PATCH' | 'DELETE', id?: string, data?: Partial<Supplier> }>({
        mutationFn: async ({ method, id, data }) => {
            const url = id ? `/api/suppliers/${id}` : "/api/suppliers"; // Assumes PATCH/DELETE routes exist at /api/suppliers/[id]
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: method !== 'DELETE' ? JSON.stringify(data) : undefined,
            });
            const result: ApiResponse<Supplier> = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || `Falha ao ${method === 'POST' ? 'criar' : method === 'PATCH' ? 'atualizar' : 'excluir'} fornecedor`);
            }
            return result.data!;
        },
        onSuccess: (data, variables) => {
            const action = variables.method === 'POST' ? 'criado' : variables.method === 'PATCH' ? 'atualizado' : 'excluído';
            notifications.show({
                title: 'Sucesso!',
                message: `Fornecedor ${action} com sucesso.`,
                color: 'green',
            });
            internalQueryClient.invalidateQueries({ queryKey: ['suppliers'] });
            handleCloseModal(); // Close modal on success
        },
        onError: (error: Error) => {
            notifications.show({
                title: 'Erro',
                message: error.message,
                color: 'red',
            });
        },
    });

    // --- Handlers ---
    const handleOpenCreateModal = () => {
        setSupplierToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (supplier: Supplier) => {
        setSupplierToEdit(supplier);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSupplierToEdit(null);
        setIsModalOpen(false);
    };

     const handleSaveSupplier = (formData: Partial<Supplier>) => {
        mutation.mutate({
            method: supplierToEdit ? 'PATCH' : 'POST',
            id: supplierToEdit?.id,
            data: formData,
        });
    };

     const handleDeleteSupplier = (id: string) => {
         if (confirm('Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.')) {
             // mutation.mutate({ method: 'DELETE', id }); // Uncomment when DELETE API route is ready
              notifications.show({title: "Info", message:"Delete API route not implemented yet.", color: "blue"});
         }
     };


  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Fornecedores" />
         {isError && (
            <Alert title="Erro ao Carregar Fornecedores" color="red" icon={<IconAlertCircle />}>
                {(error as Error)?.message}
            </Alert>
        )}
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={handleOpenCreateModal}
          w={200}
          disabled={isLoading} // Disable while loading list
        >
          Novo Fornecedor
        </Button>
        <SupplierTable
          data={suppliers ?? []}
          isLoading={isLoading || mutation.status === 'pending'}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteSupplier}
        />
      </Stack>
      <ManageSupplierModal
        opened={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSaveSupplier}
        supplierToEdit={supplierToEdit}
        isLoading={mutation.status === 'pending'}
      />
    </Container>
  );
}
