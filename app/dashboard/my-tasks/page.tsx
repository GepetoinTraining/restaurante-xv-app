// PATH: app/dashboard/my-tasks/page.tsx
'use client';

import { PageHeader } from "@/app/dashboard/components/PageHeader";
import { ApiResponse, SerializedPrepTask, UserWithWorkstation } from "@/lib/types";
import { Alert, Grid, LoadingOverlay, SegmentedControl, Text } from "@mantine/core";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconAlertCircle, IconMapPin } from "@tabler/icons-react";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import { WorkflowCard } from "@/app/components/WorkflowCard"; // <-- This is the component
import { AssignTaskModal } from "../prep-management/components/AssignTaskModal";
import { CompletePrepTaskModal } from "./components/CompletePrepTaskModal";

// Create a client
const queryClient = new QueryClient();

// Main component content
function PrepTasksPageContent() {
    const queryClientInstance = useQueryClient();
    const [taskToAssign, setTaskToAssign] = useState<SerializedPrepTask | null>(null);
    const [taskToComplete, setTaskToComplete] = useState<SerializedPrepTask | null>(null);

    const [
        assignModalOpened,
        { open: openAssignModal, close: closeAssignModal },
    ] = useDisclosure(false);
    const [
        completeModalOpened,
        { open: openCompleteModal, close: closeCompleteModal },
    ] = useDisclosure(false);

    // Query to fetch tasks assigned to the current user
    const { data: tasks, isLoading, error } = useQuery<SerializedPrepTask[]>({
        queryKey: ['myPrepTasks'],
        queryFn: () =>
            fetch('/api/prep-tasks?assignedToUserId=me&status=ASSIGNED,IN_PROGRESS').then(res => res.json()).then(data => {
                if (!data.success) throw new Error(data.error || "Failed to fetch tasks");
                return data.data;
            }),
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


    // Mutation for updating task status
    const updateTaskMutation = useMutation<SerializedPrepTask, Error, { id: string; status: string; data?: any }>({
        mutationFn: ({ id, status, data }) =>
            fetch(`/api/prep-tasks/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, ...data }), // Send status and optional data (like quantityRun)
            }).then(res => res.json()).then(apiRes => {
                if (!apiRes.success) throw new Error(apiRes.error || "Failed to update task");
                return apiRes.data;
            }),
        onSuccess: (updatedTask) => {
            queryClientInstance.invalidateQueries({ queryKey: ['myPrepTasks'] });
            queryClientInstance.invalidateQueries({ queryKey: ['allPrepTasks'] }); // Invalidate manager's view too
            
            notifications.show({
                title: 'Tarefa Atualizada!',
                message: `Status da tarefa "${updatedTask.prepRecipe.name}" mudado para ${updatedTask.status}`,
                color: 'green',
            });
            // Close modals on success
            if (updatedTask.status === 'COMPLETED') closeCompleteModal();
            if (updatedTask.status === 'ASSIGNED') closeAssignModal();
        },
        onError: (error) => {
            notifications.show({
                title: 'Erro ao atualizar tarefa',
                message: error.message,
                color: 'red',
            });
        },
    });

    // --- Handlers ---
    
    // Generic handler for simple status changes (e.g., Start)
    // More complex actions (Complete, Assign) will open modals
    const handleStatusUpdate = (id: string, newStatus: string, data?: any) => {
        if (newStatus === 'COMPLETED') {
            const task = tasks?.find(t => t.id === id);
            if (task) {
                setTaskToComplete(task);
                openCompleteModal();
            }
        } else {
            // For simple updates like IN_PROGRESS or CANCELLED
            updateTaskMutation.mutate({ id, status: newStatus, data });
        }
    };

    // Handler for completing with quantity
    const handleCompleteSubmit = (actualQuantity: string) => {
        if (taskToComplete) {
            updateTaskMutation.mutate({
                id: taskToComplete.id,
                status: 'COMPLETED',
                data: { quantityRun: actualQuantity }
            });
        }
    };
    
    // Handler for re-assigning (opens assign modal)
    const handleAssignClick = (task: SerializedPrepTask) => {
        setTaskToAssign(task);
        openAssignModal();
    };

     // Handler for submitting assignment
    const handleAssignSubmit = (assignedToUserId: string) => {
        if (taskToAssign) {
            updateTaskMutation.mutate({
                id: taskToAssign.id,
                status: 'ASSIGNED', // Re-assigning
                data: { assignedToUserId }
            });
        }
    };

    // Handler for delete (if needed, though WorkflowCard doesn't show it for these statuses)
    const handleDeleteClick = (id: string) => {
        // Implement delete mutation if required
        console.log("Delete clicked", id);
         notifications.show({
            title: 'Exclusão Pendente',
            message: 'A lógica de exclusão ainda não foi implementada.',
            color: 'orange',
        });
    };


    return (
        <>
            <PageHeader title="Minhas Tarefas de Preparo" />
            
            <div style={{ position: 'relative' }}>
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
                                {tasks.map(task => {
                                    // ---- START FIX ----
                                    // The WorkflowCard component takes the entire task object
                                    // and its own internal logic handles the display.
                                    // We just need to pass the task and the handlers.
                                    return (
                                        <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={task.id}>
                                            <WorkflowCard
                                                key={task.id}
                                                task={task}
                                                onUpdateStatus={handleStatusUpdate}
                                                onAssign={handleAssignClick}
                                                onDelete={handleDeleteClick}
                                            />
                                        </Grid.Col>
                                    );
                                    // ---- END FIX ----
                                })}
                            </Grid>
                        ) : (
                            <Text ta="center" c="dimmed" mt="xl">
                                Você não tem tarefas atribuídas ou em progresso.
                            </Text>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            <AssignTaskModal
                opened={assignModalOpened}
                onClose={closeAssignModal}
                staffList={staffList || []}
                onSubmit={handleAssignSubmit}
                task={taskToAssign}
            />

            <CompletePrepTaskModal
                opened={completeModalOpened}
                onClose={closeCompleteModal}
                onSubmit={handleCompleteSubmit}
                task={taskToComplete}
            />
        </>
    );
}

// Export the page wrapped in the QueryClientProvider
export default function MyTasksPage() {
    return (
        <QueryClientProvider client={queryClient}>
            <PrepTasksPageContent />
        </QueryClientProvider>
    );
}