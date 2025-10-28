// PATH: app/dashboard/prep-management/page.tsx
'use client';

import { PageHeader } from "@/app/dashboard/components/PageHeader";
import { ApiResponse, SerializedPrepTask, StorageLocation, UserWithWorkstation, SerializedPrepRecipe } from "@/lib/types"; // Added SerializedPrepRecipe
import { Alert, Grid, LoadingOverlay, SegmentedControl, Text, Group, Box, Title, Badge, Button } from "@mantine/core";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconAlertCircle, IconToolsKitchen2 } from "@tabler/icons-react";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { WorkflowCard } from "@/app/components/WorkflowCard";
import { AssignTaskModal } from "./components/AssignTaskModal";
import { CreatePrepTaskModal } from "./components/CreatePrepTaskModal";


// Create a client
const queryClient = new QueryClient();

// Define status filters
const statusFilters = [
    { label: 'Pendentes/Atribuídas', value: 'PENDING,ASSIGNED' }, // Combined for initial view
    { label: 'Em Progresso', value: 'IN_PROGRESS' },
    { label: 'Concluídas', value: 'COMPLETED' },
    { label: 'Canceladas/Problema', value: 'CANCELLED,PROBLEM' }, // Added Problem state
    { label: 'Todas', value: 'ALL' },
];

// Main component content
function PrepManagementContent() {
    const queryClientInstance = useQueryClient();
    const [statusFilter, setStatusFilter] = useState(statusFilters[0].value);
    const [taskToAssign, setTaskToAssign] = useState<SerializedPrepTask | null>(null);

    const [
        createModalOpened,
        { open: openCreateModal, close: closeCreateModal },
    ] = useDisclosure(false);
    const [
        assignModalOpened,
        { open: openAssignModal, close: closeAssignModal },
    ] = useDisclosure(false);

    // Query to fetch ALL prep tasks based on filter
    const { data: tasks, isLoading, error, refetch: refetchTasks } = useQuery<SerializedPrepTask[]>({
        queryKey: ['allPrepTasks', statusFilter], // Add filter to query key
        queryFn: () => {
            const params = new URLSearchParams();
            if (statusFilter !== 'ALL') {
                params.append('status', statusFilter);
            }
            return fetch(`/api/prep-tasks?${params.toString()}`).then(res => res.json()).then(data => {
                if (!data.success) throw new Error(data.error || "Failed to fetch tasks");
                return data.data;
            });
        },
    });

    // Query to fetch staff (for assign modal)
     const { data: staffList, isLoading: isLoadingStaff } = useQuery<UserWithWorkstation[]>({
        queryKey: ['staffList'],
        queryFn: () =>
            fetch('/api/staff').then(res => res.json()).then(data => {
                if (!data.success) throw new Error(data.error || "Failed to fetch staff");
                return data.data ?? [];
            }),
        staleTime: 5 * 60 * 1000, // Cache staff for 5 mins
    });

     // Query to fetch prep recipes (for create modal)
    const { data: prepRecipes, isLoading: isLoadingRecipes } = useQuery<SerializedPrepRecipe[]>({
        queryKey: ['prepRecipes'],
        queryFn: () => fetch('/api/prep-recipes').then(res => res.json()).then(data => data.data ?? []),
        staleTime: 5 * 60 * 1000, // Cache recipes for 5 mins
    });

    // Query to fetch storage locations (for create modal)
    const { data: storageLocations, isLoading: isLoadingLocations } = useQuery<StorageLocation[]>({
        queryKey: ['storageLocations'],
        queryFn: () => fetch('/api/storage-locations').then(res => res.json()).then(data => data.data ?? []),
        staleTime: 5 * 60 * 1000, // Cache locations for 5 mins
    });


    // Mutation for CREATING a task
    const createTaskMutation = useMutation<SerializedPrepTask, Error, {
        prepRecipeId: string | null;
        targetQuantity: string;
        locationId: string | null;
        assignedToUserId: string | null;
        notes: string;
     }>({
         mutationFn: (newData) =>
            fetch(`/api/prep-tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData),
            }).then(res => res.json()).then(apiRes => {
                if (!apiRes.success) throw new Error(apiRes.error || "Failed to create task");
                return apiRes.data;
            }),
        onSuccess: (newTask) => {
            queryClientInstance.invalidateQueries({ queryKey: ['allPrepTasks', statusFilter] });
            notifications.show({
                title: 'Tarefa Criada!',
                message: `Tarefa "${newTask.prepRecipe.name}" foi criada.`,
                color: 'green',
            });
            closeCreateModal();
        },
        onError: (error) => {
            notifications.show({
                title: 'Erro ao criar tarefa',
                message: error.message,
                color: 'red',
            });
        },
    });


    // Mutation for UPDATING task status or assignment
    const updateTaskMutation = useMutation<SerializedPrepTask, Error, { id: string; status: string; data?: any }>({
        mutationFn: ({ id, status, data }) =>
            fetch(`/api/prep-tasks/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, ...data }),
            }).then(res => res.json()).then(apiRes => {
                if (!apiRes.success) throw new Error(apiRes.error || "Failed to update task");
                return apiRes.data;
            }),
        onSuccess: (updatedTask) => {
            queryClientInstance.invalidateQueries({ queryKey: ['allPrepTasks', statusFilter] }); // Invalidate current view
            queryClientInstance.invalidateQueries({ queryKey: ['myPrepTasks'] }); // Invalidate user's "My Tasks" view

            notifications.show({
                title: 'Tarefa Atualizada!',
                // Use optional chaining for safety
                message: `Status da tarefa "${updatedTask.prepRecipe?.name ?? 'Desconhecida'}" mudado para ${updatedTask.status}`,
                color: 'blue',
            });
            closeAssignModal(); // Close assign modal on success
        },
        onError: (error) => {
            notifications.show({
                title: 'Erro ao atualizar tarefa',
                message: error.message,
                color: 'red',
            });
        },
    });

     // Mutation for DELETING a task (API route needs implementation)
    const deleteTaskMutation = useMutation<ApiResponse, Error, string>({
        mutationFn: (id) =>
            fetch(`/api/prep-tasks/${id}`, { // Assuming DELETE exists at /api/prep-tasks/[id]
                method: 'DELETE',
            }).then(res => res.json()).then(apiRes => {
                if (!apiRes.success) throw new Error(apiRes.error || "Failed to delete task");
                return apiRes;
            }),
        onSuccess: () => {
            queryClientInstance.invalidateQueries({ queryKey: ['allPrepTasks', statusFilter] });
            notifications.show({
                title: 'Tarefa Excluída',
                message: 'A tarefa de preparo foi excluída com sucesso.',
                color: 'green',
            });
        },
        onError: (error) => {
            notifications.show({
                title: 'Erro ao excluir tarefa',
                message: error.message,
                color: 'red',
            });
        },
    });


    // --- Handlers ---

    // Handler for status changes via menu (Cancel, Unassign)
    const handleStatusUpdate = (id: string, newStatus: string) => {
        if (newStatus === 'COMPLETED') {
             notifications.show({
                title: 'Aviso',
                message: 'A conclusão deve ser feita pela tela "Minhas Tarefas" pelo usuário atribuído ou Executar Avulso.',
                color: 'orange',
            });
            return;
        }
         // If unassigning, send null for assignedToUserId
         const data = newStatus === 'PENDING' ? { assignedToUserId: null } : undefined;
         updateTaskMutation.mutate({ id, status: newStatus, data });
    };

    // Handler for opening the assign modal
    const handleAssignClick = (task: SerializedPrepTask) => {
        setTaskToAssign(task);
        openAssignModal();
    };

     // Handler for submitting assignment from modal
    const handleAssignSubmit = (assignedToUserId: string | null) => {
        if (taskToAssign) {
            updateTaskMutation.mutate({
                id: taskToAssign.id,
                status: assignedToUserId ? 'ASSIGNED' : 'PENDING', // If null, unassign back to PENDING
                data: { assignedToUserId }
            });
            // No need to close modal here, onSuccess handles it
        }
    };

    // Handler for delete confirmation
    const handleDeleteClick = (task: SerializedPrepTask) => {
         if (confirm(`Tem certeza que deseja excluir a tarefa "${task.prepRecipe?.name ?? task.id}"? Esta ação não pode ser desfeita.`)) {
            // deleteTaskMutation.mutate(task.id); // Uncomment when API is ready
             notifications.show({title: "Info", message:"Delete API route not implemented yet.", color: "blue"});
         }
    };

    // Handler for create modal submission
    const handleCreateSubmit = (values: {
        prepRecipeId: string | null;
        targetQuantity: string;
        locationId: string | null;
        assignedToUserId: string | null;
        notes: string;
     }) => {
        createTaskMutation.mutate(values);
    };

    const combinedIsLoading = isLoading || isLoadingStaff || isLoadingRecipes || isLoadingLocations;
    const combinedIsError = error || isLoadingStaff || isLoadingRecipes || isLoadingLocations; // Any error prevents proper function
    const combinedError = error || isLoadingStaff || isLoadingRecipes || isLoadingLocations;

    return (
        <>
            <PageHeader
                title="Gerenciar Preparos"
                actionButton={
                    <Group>
                        <SegmentedControl
                            value={statusFilter}
                            onChange={setStatusFilter}
                            data={statusFilters}
                            disabled={combinedIsLoading} // Disable filter while loading data
                        />
                         <Button
                            onClick={openCreateModal}
                            leftSection={<IconToolsKitchen2 size={16} />}
                            disabled={combinedIsLoading || combinedIsError || !prepRecipes || !storageLocations || !staffList} // Ensure all data is loaded
                            loading={createTaskMutation.isPending}
                         >
                            Nova Tarefa Manual
                        </Button>
                    </Group>
                }
            />

            <Box style={{ position: 'relative' }}>
                <LoadingOverlay visible={combinedIsLoading || updateTaskMutation.isPending || deleteTaskMutation.isPending} zIndex={1000} overlayProps={{ radius: "sm", blur: 1 }} />

                {combinedIsError && !combinedIsLoading && (
                    <Alert
                        color="red"
                        title="Erro ao carregar dados"
                        icon={<IconAlertCircle />}
                        withCloseButton
                        onClose={() => {
                            queryClientInstance.invalidateQueries({ queryKey: ['allPrepTasks'] });
                            queryClientInstance.invalidateQueries({ queryKey: ['staffList'] });
                            queryClientInstance.invalidateQueries({ queryKey: ['prepRecipes'] });
                            queryClientInstance.invalidateQueries({ queryKey: ['storageLocations'] });
                        }}
                    >
                        Não foi possível carregar tarefas, equipe, receitas ou locais: {(combinedError as Error)?.message}
                    </Alert>
                )}

                {!combinedIsLoading && !combinedIsError && (
                    <>
                        {tasks && tasks.length > 0 ? (
                            <Grid mt="md">
                                {tasks.map(task => (
                                    <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={task.id}>
                                        <WorkflowCard
                                            task={task}
                                            onUpdateStatus={handleStatusUpdate}
                                            onAssign={handleAssignClick}
                                            onDelete={() => handleDeleteClick(task)} // Pass task to handler
                                        />
                                    </Grid.Col>
                                ))}
                            </Grid>
                        ) : (
                            <Text ta="center" c="dimmed" mt="xl">
                                Nenhuma tarefa encontrada para este filtro.
                            </Text>
                        )}
                    </>
                )}
            </Box>

            {/* Modals - Render them conditionally based on required data */}
            {staffList && (
                <AssignTaskModal
                    opened={assignModalOpened}
                    onClose={closeAssignModal}
                    staffList={staffList}
                    onAssign={handleAssignSubmit}
                    task={taskToAssign}
                />
            )}

            {prepRecipes && storageLocations && staffList && (
                <CreatePrepTaskModal
                    opened={createModalOpened}
                    onClose={closeCreateModal}
                    onSubmit={handleCreateSubmit}
                    isLoading={createTaskMutation.isPending}
                    recipes={prepRecipes}
                    locations={storageLocations}
                    staff={staffList}
                />
            )}
        </>
    );
}

// Export the page wrapped in the QueryClientProvider
export default function PrepManagementPage() {
    return (
        <QueryClientProvider client={queryClient}>
            <PrepManagementContent />
        </QueryClientProvider>
    );
}

