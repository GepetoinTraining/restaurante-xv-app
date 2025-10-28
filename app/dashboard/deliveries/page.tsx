// PATH: app/dashboard/deliveries/page.tsx
"use client";

import { useState } from "react";
import { Container, Stack, Alert, Group, LoadingOverlay, Text, Button } from "@mantine/core";
import { IconAlertCircle, IconTruckDelivery, IconPlus } from "@tabler/icons-react";
import { PageHeader } from "../components/PageHeader";
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CompanyClient, Menu, Vehicle, User } from "@prisma/client"; // Use Prisma types
import { DatePicker } from "@mantine/dates";
import 'dayjs/locale/pt-br';
import dayjs from "dayjs";
import { DeliveryList } from "./components/DeliveryList"; // Component to show deliveries
import { ManageDeliveryModal } from "./components/ManageDeliveryModal"; // Modal to create/edit
import { useDisclosure } from "@mantine/hooks";

// Create a client for react-query
const queryClient = new QueryClient();

// Types needed for this page, potentially serialized from API
// Basic Delivery type from API (adjust includes as needed in API route)
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
    _count?: { panShipments: number }; // Count of associated pans
};

// Simplified types for dropdowns
type SerializedCompanyClientBasic = Pick<CompanyClient, 'id' | 'companyName'>;
type SerializedVehicleBasic = Pick<Vehicle, 'id' | 'model' | 'licensePlate'>;
type SerializedDriverBasic = Pick<User, 'id' | 'name'>;
type SerializedServingPanBasic = { id: string; panModel: { name: string }, uniqueIdentifier: string | null, status: string }; // Basic pan info


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
    const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Default to today
    const [deliveryToEdit, setDeliveryToEdit] = useState<SerializedDeliveryBasic | null>(null);
    const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);

    const formattedDate = dayjs(selectedDate).format('YYYY-MM-DD');

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
            const res = await fetch(`/api/deliveries?date=${formattedDate}`);
            const result: ApiResponse<SerializedDeliveryBasic[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar entregas");
            return result.data ?? [];
        },
         enabled: !!selectedDate,
    });

    // --- Fetch data needed for the Create/Edit Modal ---
     const { data: companyClients, isLoading: isLoadingClients } = useQuery<SerializedCompanyClientBasic[]>({
        queryKey: ['companyClientsBasic'],
        queryFn: async () => fetch("/api/company-clients").then(res => res.json()).then(data => data.data ?? []),
        staleTime: 5 * 60 * 1000
    });
     const { data: vehicles, isLoading: isLoadingVehicles } = useQuery<SerializedVehicleBasic[]>({
        queryKey: ['vehiclesBasic'],
        queryFn: async () => fetch("/api/vehicles").then(res => res.json()).then(data => data.data ?? []),
        staleTime: 5 * 60 * 1000
    });
     const { data: drivers, isLoading: isLoadingDrivers } = useQuery<SerializedDriverBasic[]>({
        queryKey: ['driversBasic'], // Assumes staff API can filter by Role=DRIVER
        queryFn: async () => fetch("/api/staff?role=DRIVER").then(res => res.json()).then(data => data.data ?? []),
        staleTime: 5 * 60 * 1000
    });
     const { data: availablePans, isLoading: isLoadingPans } = useQuery<SerializedServingPanBasic[]>({
        queryKey: ['availablePans'], // API needs param ?status=AVAILABLE
        queryFn: async () => fetch("/api/serving-pans?status=AVAILABLE").then(res => res.json()).then(data => data.data ?? []),
        // Maybe shorter staleTime if pans change often
    });

    // --- Mutations ---
    const createDeliveryMutation = useMutation<any, Error, any>({ // Define specific input type later
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
            closeCreateModal();
        },
        onError: (error: Error) => notifications.show({ title: 'Erro', message: error.message, color: 'red' })
    });

    // --- Handlers ---
    const handleDateSelect = (date: Date | null) => {
        setSelectedDate(date || new Date());
    };

    const handleOpenCreate = () => {
        setDeliveryToEdit(null);
        openCreateModal();
    }

    const handleModalSubmit = (values: any) => {
        // Add default date if missing, format dates?
        const payload = { ...values, deliveryDate: formattedDate };
        createDeliveryMutation.mutate(payload);
    };


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
                    disabled={isLoading || isError} // Disable if dependent data isn't loaded
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
                // getDayProps={(date) => ({
                //     // Highlight days with deliveries? Requires fetching more data
                // })}
                style={{ minWidth: 280 }} // Prevent calendar shrinking too much
            />
             {/* Delivery List */}
             <Stack style={{ flexGrow: 1, position: 'relative' }}>
                <LoadingOverlay visible={isLoadingDeliveries} overlayProps={{blur: 1}}/>
                <Title order={4}>Entregas para {dayjs(selectedDate).format('DD/MM/YYYY')}</Title>
                 {!isLoadingDeliveries && !isErrorDeliveries && (
                    <DeliveryList
                        deliveries={deliveries ?? []}
                        // Pass handlers for viewing details, dispatching, etc. later
                    />
                 )}
                 {!isLoadingDeliveries && isErrorDeliveries && (
                     <Text c="red">Erro ao carregar lista de entregas.</Text>
                 )}
             </Stack>
        </Group>

      </Stack>
    </Container>

     {/* Create/Edit Modal */}
     <ManageDeliveryModal
        opened={createModalOpened}
        onClose={closeCreateModal}
        onSubmit={handleModalSubmit}
        isLoading={createDeliveryMutation.isPending || isLoading} // Loading if submitting or fetching dropdown data
        delivery={deliveryToEdit} // Pass null for create mode
        companyClients={companyClients ?? []}
        vehicles={vehicles ?? []}
        drivers={drivers ?? []}
        availablePans={availablePans ?? []}
     />
     </>
  );
}
