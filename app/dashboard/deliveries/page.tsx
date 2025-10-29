// PATH: app/dashboard/deliveries/page.tsx
"use client";

import { useState } from "react";
import { Container, Stack, Alert, Group, LoadingOverlay, Text, Button, Title } from "@mantine/core";
import { IconAlertCircle, IconTruckDelivery, IconPlus } from "@tabler/icons-react";
import { PageHeader } from "../components/PageHeader";
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CompanyClient, Menu, Vehicle, User, ServingPan, ServingPanModel } from "@prisma/client";
import { DatePicker } from "@mantine/dates";
import 'dayjs/locale/pt-br';
import dayjs from "dayjs";
import { DeliveryList } from "./components/DeliveryList";
import { ManageDeliveryModal } from "./components/ManageDeliveryModal";
import { useDisclosure } from "@mantine/hooks";

// Create a client for react-query
const queryClient = new QueryClient();

// Types needed for this page, potentially serialized from API
export type SerializedDeliveryBasic = {
    id: string;
    deliveryDate: string; // YYYY-MM-DD
    status: string; // DeliveryStatus enum as string
    companyClientId: string;
    companyClient: { companyName: string };
    vehicleId: string | null;
    vehicle: { licensePlate: string; model: string; } | null;
    driverId: string | null;
    driver: { name: string } | null;
    _count?: { panShipments: number };
};

// Simplified types for dropdowns - EXPORT these
export type SerializedCompanyClientBasic = Pick<CompanyClient, 'id' | 'companyName'>;
export type SerializedVehicleBasic = Pick<Vehicle, 'id' | 'model' | 'licensePlate'>;
export type SerializedDriverBasic = Pick<User, 'id' | 'name'>;
export type SerializedServingPanBasic = Pick<ServingPan, 'id' | 'uniqueIdentifier' | 'status'> & {
    panModel: Pick<ServingPanModel, 'name'>
};


// Wrapper Component
export default function DeliveriesPageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <DeliveriesPage />
    </QueryClientProvider>
  );
}

// Main Page Component
function DeliveriesPage() {
    const internalQueryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [deliveryToEdit, setDeliveryToEdit] = useState<SerializedDeliveryBasic | null>(null);
    const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);

    const formattedDate = selectedDate ? dayjs(selectedDate).format('YYYY-MM-DD') : '';

    // Fetch Deliveries for the selected date
    const {
        data: deliveries,
        isLoading: isLoadingDeliveries,
        isError: isErrorDeliveries,
        error: errorDeliveries,
        refetch: refetchDeliveries,
    } = useQuery<SerializedDeliveryBasic[]>({
        queryKey: ['deliveries', formattedDate],
        queryFn: async () => {
            if (!formattedDate) return [];
            const res = await fetch(`/api/deliveries?date=${formattedDate}`);
            const result: ApiResponse<SerializedDeliveryBasic[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar entregas");
            return result.data ?? [];
        },
         enabled: !!selectedDate,
    });

    // --- Fetch data needed for the Create/Edit Modal ---
    
    // --- START FIX: Destructure isError and error for all queries ---
     const { data: companyClients, isLoading: isLoadingClients, isError: isErrorClients, error: errorClients } = useQuery<SerializedCompanyClientBasic[]>({
        queryKey: ['companyClientsBasic'],
        queryFn: async () => {
            const res = await fetch("/api/company-clients");
            const result: ApiResponse<SerializedCompanyClientBasic[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar clientes");
            return result.data ?? [];
        },
        staleTime: 5 * 60 * 1000
    });
     const { data: vehicles, isLoading: isLoadingVehicles, isError: isErrorVehicles, error: errorVehicles } = useQuery<SerializedVehicleBasic[]>({
        queryKey: ['vehiclesBasic'],
        queryFn: async () => {
             const res = await fetch("/api/vehicles");
             const result: ApiResponse<SerializedVehicleBasic[]> = await res.json();
             if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar veículos");
             return result.data ?? [];
        },
        staleTime: 5 * 60 * 1000
    });
     const { data: drivers, isLoading: isLoadingDrivers, isError: isErrorDrivers, error: errorDrivers } = useQuery<SerializedDriverBasic[]>({
        queryKey: ['driversBasic'],
        queryFn: async () => {
             const res = await fetch("/api/staff?role=DRIVER");
             const result: ApiResponse<SerializedDriverBasic[]> = await res.json();
             if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar motoristas");
             return result.data ?? [];
        },
        staleTime: 5 * 60 * 1000
    });
     const { data: availablePans, isLoading: isLoadingPans, isError: isErrorPans, error: errorPans } = useQuery<SerializedServingPanBasic[]>({
        queryKey: ['availablePans'],
        queryFn: async () => {
             const res = await fetch("/api/serving-pans?status=AVAILABLE");
             const result: ApiResponse<SerializedServingPanBasic[]> = await res.json();
             if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar panelas disponíveis");
             return result.data ?? [];
        },
    });
    // --- END FIX ---

    // --- Mutations ---
    const createDeliveryMutation = useMutation<any, Error, any>({
        mutationFn: async (deliveryData) => {
            const response = await fetch("/api/deliveries", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deliveryData),
            });
            const result: ApiResponse = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || "Falha ao criar entrega");
            return result.data;
        },
        onSuccess: () => {
            notifications.show({ title: 'Sucesso!', message: 'Entrega criada.', color: 'green' });
            internalQueryClient.invalidateQueries({ queryKey: ['deliveries', formattedDate] });
            internalQueryClient.invalidateQueries({ queryKey: ['availablePans'] });
            closeCreateModal();
        },
        onError: (error: Error) => notifications.show({ title: 'Erro', message: error.message, color: 'red' })
    });

    // --- Handlers ---
    const handleDateSelect = (date: any) => { // Use 'any' to bypass anomalous DatePicker type issue
        setSelectedDate(date);
    };

    const handleOpenCreate = () => {
        setDeliveryToEdit(null);
        openCreateModal();
    }

    const handleModalSubmit = (values: any) => {
        if (!selectedDate) {
             notifications.show({ title: "Erro", message: "Selecione uma data para a entrega.", color: "orange"});
             return;
        }
        const payload = { ...values, deliveryDate: formattedDate };
        createDeliveryMutation.mutate(payload);
    };

    // These lines (187-188) should now work
    const isLoading = isLoadingDeliveries || isLoadingClients || isLoadingVehicles || isLoadingDrivers || isLoadingPans;
    const isError = isErrorDeliveries || isErrorClients || isErrorVehicles || isErrorDrivers || isErrorPans;
    const error = errorDeliveries || errorClients || errorVehicles || errorDrivers || errorPans;

  return (
    <>
    <Container fluid>
      <Stack gap="lg">
        <PageHeader
            title="Despacho de Entregas"
            actionButton={
                <Button
                    leftSection={<IconPlus size={16}/>}
                    onClick={handleOpenCreate}
                    disabled={isLoading || isError}
                >
                    Nova Entrega
                </Button>
            }
        />
         {isError && (
            <Alert title="Erro ao Carregar Dados" color="red" icon={<IconAlertCircle />}>
                {(error as Error)?.message}
            </Alert>
         )}
        <Group align="flex-start">
             <DatePicker
                locale="pt-br"
                value={selectedDate}
                onChange={handleDateSelect}
                style={{ minWidth: 280 }}
            />
             <Stack style={{ flexGrow: 1, position: 'relative' }}>
                <LoadingOverlay visible={isLoadingDeliveries} overlayProps={{blur: 1}}/>
                <Title order={4}>Entregas para {selectedDate ? dayjs(selectedDate).format('DD/MM/YYYY') : 'Data não selecionada'}</Title>
                 {!isLoadingDeliveries && !isErrorDeliveries && selectedDate && (
                    <DeliveryList
                        deliveries={deliveries ?? []}
                    />
                 )}
                 {!isLoadingDeliveries && isErrorDeliveries && (
                     <Text c="red">Erro ao carregar lista de entregas.</Text>
                 )}
                 {!selectedDate && (
                     <Text c="dimmed">Selecione uma data para ver as entregas.</Text>
                 )}
             </Stack>
        </Group>

      </Stack>
    </Container>

     <ManageDeliveryModal
        opened={createModalOpened}
        onClose={closeCreateModal}
        onSubmit={handleModalSubmit}
        isLoading={createDeliveryMutation.isPending || isLoadingClients || isLoadingVehicles || isLoadingDrivers || isLoadingPans}
        delivery={deliveryToEdit}
        companyClients={companyClients ?? []}
        vehicles={vehicles ?? []}
        drivers={drivers ?? []}
        availablePans={availablePans ?? []}
     />
     </>
  );
}