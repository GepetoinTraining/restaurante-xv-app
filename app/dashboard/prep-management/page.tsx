// PATH: app/dashboard/prep-management/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Container, Stack, Title, Text, Loader, Alert, SimpleGrid, SegmentedControl, Button, Group, Center } from "@mantine/core";
import { PageHeader } from "../components/PageHeader";
import { ApiResponse, SerializedPrepTask, SerializedPrepRecipe, StorageLocation, StaffSession, UserWithWorkstation } from "@/lib/types"; // Added more types
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IconAlertCircle, IconPlus } from "@tabler/icons-react";
import { WorkflowCard } from "@/app/components/WorkflowCard";
import { PrepTaskStatus } from "@prisma/client";
import { useDisclosure } from "@mantine/hooks";
import { CreatePrepTaskModal } from "./components/CreatePrepTaskModal"; // Import create modal
import { AssignTaskModal } from "./components/AssignTaskModal"; // Import assign modal

// Create a client
const queryClientInternal = new QueryClient();

// Type for filters
type TaskMgmtFilter = "pending" | "assigned" | "inprogress" | "recent"; // Added recent

// Wrapper for React Query
export default function PrepManagementPageWrapper() {
    return (
        <QueryClientProvider client={queryClientInternal}>
            <PrepManagementPage/>
        </QueryClientProvider>
    );
}

// Main page component
function PrepManagementPage() {
    const internalQueryClient = useQueryClient(); // Use hook inside provider context
    const [filter, setFilter] = useState<TaskMgmtFilter>("pending");
    const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
    const [assignModalOpened, { open: openAssignModal, close: closeAssignModal }] = useDisclosure(false);
    const [taskToAssign, setTaskToAssign] = useState<SerializedPrepTask | null>(null);

    // Fetch Staff (Users) for assignment dropdowns
    const { data: staffList, isLoading: isLoadingStaff } = useQuery<UserWithWorkstation[]>({
        queryKey: ['staffList'],
        queryFn: async () => {
            const res = await fetch('/api/staff');
            const result: ApiResponse<UserWithWorkstation[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar equipe");
            // Filter for roles that can execute prep tasks? e.g., COOK, BARTENDER
            return result.data?.filter(user => user.isActive && (user.role === 'COOK' || user.role === 'BARTENDER' || user.role === 'MANAGER' || user.role === 'OWNER')) ?? [];
        }
    });

    // Fetch Prep Recipes for create modal
     const { data: prepRecipes, isLoading: isLoadingRecipes } = useQuery<SerializedPrepRecipe[]>({
        queryKey: ['prepRecipes'], // Reuse key if appropriate
        queryFn: async () => {
            const res = await fetch("/api/prep-recipes");
            const result: ApiResponse<SerializedPrepRecipe[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar receitas de preparo");
            return result.data ?? [];
        },
    });

     // Fetch Storage Locations for create modal
    const { data: locations, isLoading: isLoadingLocations } = useQuery<StorageLocation[]>({
        queryKey: ['storageLocations'], // Reuse key
        queryFn: async () => {
            const res = await fetch("/api/storage-locations");
            const result: ApiResponse<StorageLocation[]> = await res.json();
            if (result.success && result.data) return result.data;
            throw new Error(result.error || "Falha ao buscar locais de estoque");
        },
    });


    // Fetch Prep Tasks based on filter
    const {
        data: tasks,
        isLoading: isLoadingTasks,
        isError,
        error,
        refetch,
    } = useQuery<SerializedPrepTask[]>({
        queryKey: ['prepTasksMgmt', filter],
        queryFn: async () => {
            const params = new URLSearchParams();
            let statusFilter = '';
            let includeCompleted = false;

            switch (filter) {
                case 'pending': statusFilter = 'PENDING'; break;
                case 'assigned': statusFilter = 'ASSIGNED'; break;
                case 'inprogress': statusFilter = 'IN_PROGRESS'; break;
                case 'recent':
                    statusFilter = 'COMPLETED,CANCELLED'; // Fetch recent completed/cancelled
                    includeCompleted = true;
                     // Add date range later if needed
                    break;
            }
             params.set('status', statusFilter);
             if(includeCompleted) params.set('includeCompleted', 'true');

            const res = await fetch(`/api/prep-tasks?${params.toString()}`);
            const result: ApiResponse<SerializedPrepTask[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar tarefas de preparo");
            return result.data ?? [];
        },
         refetchInterval: 30000, // Refetch every 30 seconds
         refetchIntervalInBackground: true,
    });

    // Mutation for Assigning/Unassigning
    const assignTaskMutation = useMutation<
        ApiResponse<SerializedPrepTask>, Error, { taskId: string; userId: string | null }
    >({
        mutationFn: ({ taskId, userId }) => fetch(`/api/prep-tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: userId ? PrepTaskStatus.ASSIGNED : PrepTaskStatus.PENDING, assignedToUserId: userId }),
        }).then(res => res.json().then(data => {
            if (!res.ok) throw new Error(data.error || `Falha ao ${userId ? 'atribuir' : 'desatribuir'} tarefa`);
            return data;
        })),
        onSuccess: (data, variables) => {
            if (data.success) {
                notifications.show({ title: 'Sucesso', message: `Tarefa ${variables.userId ? 'atribuída' : 'retornou para pendente'}!`, color: 'green' });
                refetch(); // Refetch the list
            } else {
                notifications.show({ title: 'Erro', message: data.error || 'Falha na operação', color: 'red' });
            }
        },
        onError: (error) => {
             notifications.show({ title: 'Erro', message: error.message, color: 'red' });
        }
    });


    const handleOpenAssignModal = (task: SerializedPrepTask) => {
        setTaskToAssign(task);
        openAssignModal();
    }

    const handleAssignTask = (userId: string | null) => {
        if (taskToAssign) {
            assignTaskMutation.mutate({ taskId: taskToAssign.id, userId: userId });
        }
        closeAssignModal();
    }

    const handleTaskCreated = () => {
        closeCreateModal();
        refetch(); // Refresh list after creating
    }


    const isLoading = isLoadingTasks || isLoadingStaff || isLoadingRecipes || isLoadingLocations;

    return (
        <>
            <Container fluid>
                <Stack gap="lg">
                    <PageHeader title="Gerenciar Tarefas de Preparo" />

                     <Group justify="space-between">
                         <SegmentedControl
                            value={filter}
                            onChange={(value) => setFilter(value as TaskMgmtFilter)}
                            data={[
                                { label: 'Pendentes', value: 'pending' },
                                { label: 'Atribuídas', value: 'assigned' },
                                { label: 'Em Progresso', value: 'inprogress' },
                                { label: 'Recentes', value: 'recent' }, // Completed/Cancelled
                            ]}
                            color="blue"
                        />
                         <Button
                            leftSection={<IconPlus size={14} />}
                            onClick={openCreateModal}
                            disabled={isLoading || !prepRecipes || prepRecipes.length === 0 || !locations || locations.length === 0}
                        >
                            Criar Nova Tarefa
                        </Button>
                    </Group>


                    {isLoading && !tasks && <Center h={200}><Loader /></Center>}
                    {isError && (
                        <Alert title="Erro ao Carregar Tarefas" color="red" icon={<IconAlertCircle />}>
                            {(error as Error)?.message}
                        </Alert>
                    )}
                     {!isLoading && (!prepRecipes || prepRecipes.length === 0) && (
                          <Alert title="Atenção" color="orange" icon={<IconAlertCircle />}>
                            Nenhuma Receita de Preparo definida. Crie receitas antes de criar tarefas.
                        </Alert>
                     )}
                      {!isLoading && (!locations || locations.length === 0) && (
                          <Alert title="Atenção" color="orange" icon={<IconAlertCircle />}>
                            Nenhum Local de Estoque/Produção definido. Crie locais na tela de Planta & Mesas.
                        </Alert>
                     )}

                    {!isLoading && tasks?.length === 0 && (
                        <Text c="dimmed" ta="center" mt="xl">Nenhuma tarefa encontrada para este filtro.</Text>
                    )}

                    {tasks && tasks.length > 0 && (
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                           {tasks.map((task) => {
                               let cardActions: React.ReactNode = null;
                               if (task.status === PrepTaskStatus.PENDING) {
                                   cardActions = <Button size="xs" onClick={() => handleOpenAssignModal(task)} disabled={!staffList || staffList.length === 0}>Atribuir</Button>;
                               } else if (task.status === PrepTaskStatus.ASSIGNED) {
                                   cardActions = <Button size="xs" variant="outline" color="gray" onClick={() => handleOpenAssignModal(task)}>Reatribuir</Button>;
                               }
                               // In Progress, Completed, Cancelled don't have manager actions here (maybe Cancel later)

                               return (
                                   <WorkflowCard
                                       key={task.id}
                                       cardId={task.id}
                                       title={task.prepRecipe.name}
                                       status={task.status}
                                       assignedTo={task.assignedTo}
                                       estimatedTime={task.prepRecipe.estimatedLaborTime}
                                        details={
                                           <Stack gap={2}>
                                               <Text size="sm">
                                                   Meta: <Text span fw={500}>{task.targetQuantity} {task.prepRecipe.outputIngredient.unit}</Text> de <Text span fw={500}>{task.prepRecipe.outputIngredient.name}</Text>
                                               </Text>
                                               <Text size="xs" c="dimmed">Local: {task.location.name}</Text>
                                               {task.notes && <Text size="xs" c="dimmed">Notas: {task.notes}</Text>}
                                               {task.status === PrepTaskStatus.COMPLETED && task.quantityRun !== null && (
                                                   <Text size="xs" c="dimmed">Produzido: {task.quantityRun} {task.prepRecipe.outputIngredient.unit}</Text>
                                               )}
                                                {task.status === PrepTaskStatus.COMPLETED && task.executedBy && (
                                                   <Text size="xs" c="dimmed">Por: {task.executedBy.name}</Text>
                                               )}
                                           </Stack>
                                       }
                                       actions={cardActions}
                                   />
                               );
                           })}
                        </SimpleGrid>
                    )}

                </Stack>
            </Container>

            {/* Modals */}
             <CreatePrepTaskModal
                opened={createModalOpened}
                onClose={closeCreateModal}
                onSuccess={handleTaskCreated}
                recipes={prepRecipes ?? []}
                locations={locations ?? []}
                staff={staffList ?? []}
            />

            <AssignTaskModal
                opened={assignModalOpened}
                onClose={closeAssignModal}
                onAssign={handleAssignTask}
                staffList={staffList ?? []}
                task={taskToAssign}
            />
        </>
    );
}