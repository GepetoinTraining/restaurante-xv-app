// PATH: app/dashboard/company-clients/page.tsx
"use client";

import { useState } from "react";
import { Button, Container, Stack, Alert } from "@mantine/core";
import { IconPlus, IconAlertCircle } from "@tabler/icons-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CompanyClient } from "@prisma/client";
// --- START FIX: Import the type definition from the component file where it's defined (or a shared types file) ---
// Assuming CompanyClientTable now correctly exports or defines this type.
// If not, this type needs to be defined centrally (e.g., in lib/types.ts)
// For now, using the local type defined below.
import { CompanyClientTable } from "./components/CompanyClientTable";
import { ManageCompanyClientModal } from "./components/ManageCompanyClientModal";
// --- END FIX ---

// Create a client for react-query
const queryClient = new QueryClient();

// Type for API response data (serialized) - USED BY THIS PAGE AND TABLE
export type CompanyClientApiResponse = Omit<CompanyClient, 'consumptionFactor'> & {
    id: string; // Ensure ID is present
    consumptionFactor: string;
    // --- START FIX: Removed non-existent fields ---
    // latitude: number | null;
    // longitude: number | null;
    // --- END FIX ---
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
            // API route now correctly serializes, so direct return is fine
            return result.data ?? [];
        },
    });

    // --- Mutations ---
    // Combined mutation for create/update/delete
    const mutation = useMutation<any, Error, { method: 'POST' | 'PATCH' | 'DELETE', id?: string, data?: any }>({
        mutationFn: async ({ method, id, data }) => {
            const url = id ? `/api/company-clients/${id}` : "/api/company-clients";
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                // Only send body for POST/PATCH
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
            handleCloseModal(); // Close modal on success for create/update
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
        setClientToEdit(null); // Clear edit state
        setIsModalOpen(false);
    };

     // Renamed handler to clarify it triggers the mutation
     const handleSaveClient = (formData: any) => {
        mutation.mutate({
            method: clientToEdit ? 'PATCH' : 'POST',
            id: clientToEdit?.id,
            data: formData, // Pass validated form data
        });
    };

     const handleDeleteClient = (id: string) => {
        // Simple confirm dialog
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
          // --- START FIX: Pass isLoading prop ---
          isLoading={isLoading || mutation.isPending} // Show loading if fetching OR mutating
          // --- END FIX ---
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteClient}
        />
      </Stack>
      <ManageCompanyClientModal
        opened={isModalOpen}
        onClose={handleCloseModal}
        // --- START FIX: Pass 'onSuccess' prop ---
        onSuccess={handleSaveClient} // Pass the save handler as onSuccess
        // --- END FIX ---
        client={clientToEdit} // Renamed prop from clientToEdit
        isLoading={mutation.isPending} // Pass mutation loading state
      />
    </Container>
  );
}