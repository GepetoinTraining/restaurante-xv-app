// PATH: app/dashboard/company-clients/page.tsx
"use client";

import { useState } from "react";
import { Button, Container, Stack, Alert } from "@mantine/core";
import { IconPlus, IconAlertCircle } from "@tabler/icons-react";
import { PageHeader } from "../components/PageHeader";
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CompanyClient } from "@prisma/client"; // Use Prisma type for editing
import { CompanyClientTable, SerializedCompanyClientWithId } from "./components/CompanyClientTable"; // Import table and serialized type
import { ManageCompanyClientModal } from "./components/ManageCompanyClientModal";

// Create a client for react-query
const queryClient = new QueryClient();

// Type for API response data (serialized)
type CompanyClientApiResponse = Omit<CompanyClient, 'consumptionFactor' | 'latitude' | 'longitude'> & {
    id: string; // Ensure ID is present
    consumptionFactor: string;
    latitude: number | null;
    longitude: number | null;
};


// Wrapper Component
export default function CompanyClientsPageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <CompanyClientsPage />
    </QueryClientProvider>
  );
}

// Main Page Component
function CompanyClientsPage() {
    const internalQueryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<CompanyClientApiResponse | null>(null);

    // Fetch Clients
    const {
        data: clients,
        isLoading,
        isError,
        error,
        refetch
    } = useQuery<CompanyClientApiResponse[]>({
        queryKey: ['companyClients'],
        queryFn: async () => {
            const res = await fetch("/api/company-clients");
            const result: ApiResponse<CompanyClientApiResponse[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar clientes B2B");
            return result.data ?? [];
        },
    });

    // --- Mutations ---
    const mutation = useMutation<any, Error, { method: 'POST' | 'PATCH' | 'DELETE', id?: string, data?: any }>({
        mutationFn: async ({ method, id, data }) => {
            const url = id ? `/api/company-clients/${id}` : "/api/company-clients";
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: method !== 'DELETE' ? JSON.stringify(data) : undefined,
            });
            const result: ApiResponse = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || `Falha ao ${method === 'POST' ? 'criar' : method === 'PATCH' ? 'atualizar' : 'excluir'} cliente`);
            }
            return result.data;
        },
        onSuccess: (data, variables) => {
            const action = variables.method === 'POST' ? 'criado' : variables.method === 'PATCH' ? 'atualizado' : 'excluído';
            notifications.show({
                title: 'Sucesso!',
                message: `Cliente ${action} com sucesso.`,
                color: 'green',
            });
            internalQueryClient.invalidateQueries({ queryKey: ['companyClients'] });
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
        setClientToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (client: CompanyClientApiResponse) => {
        setClientToEdit(client);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setClientToEdit(null);
        setIsModalOpen(false);
    };

     const handleSaveClient = (formData: any) => {
        mutation.mutate({
            method: clientToEdit ? 'PATCH' : 'POST',
            id: clientToEdit?.id,
            data: formData,
        });
    };

     const handleDeleteClient = (id: string) => {
        if (confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
            mutation.mutate({ method: 'DELETE', id });
        }
    };


  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Clientes B2B (Empresas)" />
         {isError && (
            <Alert title="Erro ao Carregar Clientes" color="red" icon={<IconAlertCircle />}>
                {(error as Error)?.message}
            </Alert>
        )}
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={handleOpenCreateModal}
          w={200}
        >
          Novo Cliente B2B
        </Button>
        <CompanyClientTable
          data={clients ?? []}
          isLoading={isLoading || mutation.status === 'pending'}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteClient}
        />
      </Stack>
      <ManageCompanyClientModal
        opened={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSaveClient}
        clientToEdit={clientToEdit}
        isLoading={mutation.status === 'pending'}
      />
    </Container>
  );
}
