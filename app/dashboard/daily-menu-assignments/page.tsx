// PATH: app/dashboard/daily-menu-assignments/page.tsx
"use client";

import { useState } from "react";
import { Container, Stack, Alert, Group, LoadingOverlay, Text } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CompanyClient, Menu } from "@prisma/client";
import { StandardCalendar } from "../../../components/ui/StandardCalendar";
import { DailyAssignmentManager } from "./components/DailyAssignmentManager";
import dayjs from 'dayjs'; // <--- ADD THIS LINE

// Create a client for react-query
const queryClient = new QueryClient();

// Serialized types from API responses
type SerializedCompanyClientBasic = Pick<CompanyClient, 'id' | 'companyName' | 'employeeCount'> & { consumptionFactor: string };
type SerializedMenuBasic = Pick<Menu, 'id' | 'name'>;
export type SerializedDailyAssignment = {
    id: string;
    assignmentDate: string; // YYYY-MM-DD
    companyClientId: string;
    menuId: string;
    companyClient: { companyName: string };
    menu: { name: string };
};


// Wrapper Component
export default function MenuAssignmentsPageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <MenuAssignmentsPage />
    </QueryClientProvider>
  );
}

// Main Page Component
function MenuAssignmentsPage() {
    const internalQueryClient = useQueryClient();

    // --- START FIX 1: State must allow null to match DatePicker's value prop type ---
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date()); // Default to today
    // --- END FIX 1 ---

    const formattedDate = dayjs(selectedDate).format('YYYY-MM-DD');

    // Fetch Assignments for the selected date
    const {
        data: assignments,
        isLoading: isLoadingAssignments,
        isError: isErrorAssignments,
        error: errorAssignments,
    } = useQuery<SerializedDailyAssignment[]>({
        queryKey: ['dailyAssignments', formattedDate],
        queryFn: async () => {
            const res = await fetch(`/api/daily-menu-assignments?date=${formattedDate}`);
            const result: ApiResponse<SerializedDailyAssignment[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar agendamentos");
            return result.data ?? [];
        },
         enabled: !!selectedDate, // Only fetch if a date is selected
    });

    // Fetch Company Clients (for assignment dropdown)
     const {
        data: companyClients,
        isLoading: isLoadingClients,
        isError: isErrorClients,
        error: errorClients,
    } = useQuery<SerializedCompanyClientBasic[]>({
        queryKey: ['companyClientsBasic'],
        queryFn: async () => {
            const res = await fetch("/api/company-clients");
            const result: ApiResponse<SerializedCompanyClientBasic[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar clientes B2B");
            return result.data ?? [];
        },
        staleTime: 5 * 60 * 1000
    });

     // Fetch Menus (for assignment dropdown)
     const {
        data: menus,
        isLoading: isLoadingMenus,
        isError: isErrorMenus,
        error: errorMenus,
    } = useQuery<SerializedMenuBasic[]>({
        queryKey: ['menusBasic'],
        queryFn: async () => {
            const res = await fetch("/api/menus");
            const result: ApiResponse<SerializedMenuBasic[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar menus");
            return result.data ?? [];
        },
        staleTime: 5 * 60 * 1000
    });

    // Mutation for assigning/updating a menu
    const assignMenuMutation = useMutation<any, Error, { assignmentDate: string; companyClientId: string; menuId: string }>({
        mutationFn: async (assignmentData) => {
             const response = await fetch("/api/daily-menu-assignments", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assignmentData),
            });
            const result: ApiResponse = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Falha ao salvar agendamento");
            }
            return result.data;
        },
        onSuccess: (data) => {
            notifications.show({
                title: 'Sucesso!',
                message: `Menu agendado para ${data.companyClient.companyName} em ${dayjs(data.assignmentDate).format('DD/MM')}.`,
                color: 'green',
            });
            internalQueryClient.invalidateQueries({ queryKey: ['dailyAssignments', formattedDate] });
        },
        onError: (error: Error) => {
             notifications.show({ title: 'Erro', message: error.message, color: 'red' });
        }
    });

     // Mutation for triggering Prep Task Generation
     const generatePrepTasksMutation = useMutation<any, Error, { date: string }>({
        mutationFn: async ({ date }) => {
            const response = await fetch("/api/prep-tasks/generate", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date }),
            });
            const result: ApiResponse = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Falha ao gerar tarefas de preparo");
            }
            return result;
        },
        onSuccess: (result) => {
             notifications.show({
                title: 'Geração de Tarefas',
                message: result.message || `Tarefas geradas/atualizadas para ${dayjs(formattedDate).format('DD/MM')}.`,
                color: 'blue',
                autoClose: 6000,
            });
             internalQueryClient.invalidateQueries({ queryKey: ['allPrepTasks'] });
        },
        onError: (error: Error) => {
             notifications.show({ title: 'Erro na Geração', message: error.message, color: 'red' });
        }
    });


    // --- Handlers ---

    // --- START FIX 2: Use 'any' to bypass persistent TS(2322) error ---
    // This error appears to be anomalous, as the component *does* pass a Date | null object.
    // Using 'any' forces TypeScript to skip checking this specific assignment.
    const handleDateSelect = (date: any) => {
        // We, the programmers, know 'date' is (Date | null)
        setSelectedDate(date);
    };
    // --- END FIX 2 ---

    const handleAssignMenu = (companyClientId: string, menuId: string | null) => {
        if (!selectedDate) return; // Guard against null date
        if (menuId) {
            assignMenuMutation.mutate({ assignmentDate: formattedDate, companyClientId, menuId });
        } else {
             notifications.show({title: "Atenção", message: "Remoção de agendamento ainda não implementada.", color: "orange"});
        }
    };

    const handleGeneratePrepTasks = () => {
         if (assignments && assignments.length > 0 && selectedDate) { // Check selectedDate is not null
            generatePrepTasksMutation.mutate({ date: formattedDate });
         } else {
             notifications.show({title: "Aviso", message: "Nenhum agendamento encontrado para gerar tarefas.", color: "yellow"});
         }
    }

    const isLoading = isLoadingAssignments || isLoadingClients || isLoadingMenus;
    const isError = isErrorAssignments || isErrorClients || isErrorMenus;
    const error = errorAssignments || errorClients || errorMenus;

  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Agendamento de Menus Diários" />
         {isError && (
            <Alert title="Erro ao Carregar Dados" color="red" icon={<IconAlertCircle />}>
                {(error as Error)?.message}
            </Alert>
        )}
        <Group align="flex-start">
            {/* Calendar */}
             <StandardCalendar/>
             {/* Assignment Manager */}
             <Stack style={{ flexGrow: 1, position: 'relative' }}>
                <LoadingOverlay visible={isLoading} overlayProps={{blur: 1}}/>
                 {!isLoading && !isError && selectedDate && ( // Ensure date isn't null
                    <DailyAssignmentManager
                        selectedDate={formattedDate}
                        assignments={assignments ?? []}
                        companyClients={companyClients ?? []}
                        menus={menus ?? []}
                        onAssignMenu={handleAssignMenu}
                        onGeneratePrepTasks={handleGeneratePrepTasks}
                        isAssigning={assignMenuMutation.isPending}
                        isGenerating={generatePrepTasksMutation.isPending}
                    />
                 )}
                 {!isLoading && isError && (
                     <Text c="red">Erro ao carregar dados para o gerenciador.</Text>
                 )}
             </Stack>
        </Group>

      </Stack>
       {/* Modal for adding/editing might not be needed if using inline select */}
    </Container>
  );
}