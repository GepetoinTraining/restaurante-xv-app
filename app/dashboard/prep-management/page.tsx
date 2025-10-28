// PATH: app/dashboard/prep-management/page.tsx
'use client';

import { PageHeader } from "@/app/dashboard/components/PageHeader";
import { ApiResponse, SerializedPrepTask, StorageLocation, UserWithWorkstation } from "@/lib/types";
import { Alert, Grid, LoadingOverlay, SegmentedControl, Text, Group, Box, Title, Badge, Button } from "@mantine/core"; // Added Button
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconAlertCircle, IconToolsKitchen2 } from "@tabler/icons-react";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { WorkflowCard } from "@/app/components/WorkflowCard"; 
import { AssignTaskModal } from "./components/AssignTaskModal";
import { CreatePrepTaskModal } from "./components/CreatePrepTaskModal";
import { SerializedPrepRecipe } from "@/lib/types"; 

// Create a client
const queryClient = new QueryClient();

// Define status filters
const statusFilters = [
    { label: 'Pendentes', value: 'PENDING,ASSIGNED' },
    { label: 'Em Progresso', value: 'IN_PROGRESS' },
    { label: 'Concluídas', value: 'COMPLETED' },
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
    const { data: tasks, isLoading, error } = useQuery<SerializedPrepTask[]>({
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
     const { data: staffList } = useQuery<UserWithWorkstation[]>({
        queryKey: ['staffList'],
        queryFn: () =>
            fetch('/api/staff').then(res => res.json()).then(data => {
                if (!data.success) throw new Error(data.error || "Failed to fetch staff");
                return data.data;
            }),
    });
    
     // Query to fetch prep recipes (for create modal)
    const { data: prepRecipes } = useQuery<SerializedPrepRecipe[]>({
        queryKey: ['prepRecipes'],
        queryFn: () => fetch('/api/prep-recipes').then(res => res.json()).then(data => data.data),
    });

    // Query to fetch storage locations (for create modal)
    const { data: storageLocations } = useQuery<StorageLocation[]>({
        queryKey: ['storageLocations'],
        queryFn: () => fetch('/api/storage-locations').then(res => res.json()).then(data => data.data),
    });


    // Mutation for CREATING a task
    // ---- START FIX: Update mutation type to match modal form ----
    const createTaskMutation = useMutation<SerializedPrepTask, Error, { 
        prepRecipeId: string | null;
        targetQuantity: string;
        locationId: string | null;
        assignedToUserId: string | null;
        notes: string;
     }>({
    // ---- END FIX ----
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
            queryClientInstance.invalidateQueries({ queryKey: ['allPrepTasks'] });
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
            queryClientInstance.invalidateQueries({ queryKey: ['allPrepTasks'] });
            queryClientInstance.invalidateQueries({ queryKey: ['myPrepTasks'] }); // Invalidate user's view
            
            notifications.show({
                title: 'Tarefa Atualizada!',
                message: `Status da tarefa "${updatedTask.prepRecipe.name}" mudado para ${updatedTask.status}`,
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
    
     // Mutation for DELETING a task
    const deleteTaskMutation = useMutation<ApiResponse, Error, string>({
        mutationFn: (id) =>
            fetch(`/api/prep-tasks/${id}`, {
                method: 'DELETE',
            }).then(res => res.json()).then(apiRes => {
                if (!apiRes.success) throw new Error(apiRes.error || "Failed to delete task");
                return apiRes;
            }),
        onSuccess: () => {
            queryClientInstance.invalidateQueries({ queryKey: ['allPrepTasks'] });
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
    
    // Handler for status changes that don't need a modal (e.g., Cancel)
    const handleStatusUpdate = (id: string, newStatus: string) => {
        if (newStatus === 'COMPLETED') {
             notifications.show({
                title: 'Aviso',
                message: 'A conclusão deve ser feita pela tela "Minhas Tarefas" pelo usuário atribuído.',
                color: 'orange',
            });
            return;
        }
         updateTaskMutation.mutate({ id, status: newStatus });
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
                status: assignedToUserId ? 'ASSIGNED' : 'PENDING', // If null, unassign
                data: { assignedToUserId }
            });
        }
    };

    // Handler for delete
    const handleDeleteClick = (id: string) => {
        deleteTaskMutation.mutate(id);
    };
    
    // ---- START FIX: Update handler signature ----
    const handleCreateSubmit = (values: { 
        prepRecipeId: string | null;
        targetQuantity: string;
        locationId: string | null;
        assignedToUserId: string | null;
        notes: string;
     }) => {
    // ---- END FIX ----
        createTaskMutation.mutate(values);
    };


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
                        />
                         <Button onClick={openCreateModal} leftSection={<IconToolsKitchen2 size={16} />}>
                            Nova Tarefa
                        </Button>
                    </Group>
                }
            />
            
            <Box style={{ position: 'relative' }}>
                <LoadingOverlay visible={isLoading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
                
                {error && (
                    <Alert 
                        color="red" 
                        title="Erro ao carregar tarefas" 
                        icon={<IconAlertCircle />} 
                        withCloseButton 
                        onClose={() => queryClientInstance.resetQueries()}
                    >
                        {error instanceof Error ? error.message : "Ocorreu um erro desconhecido."}
                    </Alert>
                )}

                {!isLoading && !error && (
                    <>
                        {tasks && tasks.length > 0 ? (
                            <Grid>
                                {tasks.map(task => (
                                    <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={task.id}>
                                        <WorkflowCard
                                            key={task.id}
                                            task={task}
                                            onUpdateStatus={handleStatusUpdate}
                                            onAssign={handleAssignClick}
                                            onDelete={handleDeleteClick}
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

            {/* Modals */}
            <AssignTaskModal
                opened={assignModalOpened}
                onClose={closeAssignModal}
                staffList={staffList || []}
                onAssign={handleAssignSubmit}
                task={taskToAssign}
            />
            
            {/* ---- START FIX: Pass correct props ---- */}
            <CreatePrepTaskModal
                opened={createModalOpened}
                onClose={closeCreateModal}
                onSubmit={handleCreateSubmit}
                isLoading={createTaskMutation.isPending}
                recipes={prepRecipes || []}
                locations={storageLocations || []}
                staff={staffList || []}
            />
            {/* ---- END FIX ---- */}
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