// PATH: app/dashboard/my-tasks/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Container, Stack, Title, Text, Loader, Alert, SimpleGrid, SegmentedControl, Center } from "@mantine/core";
import { PageHeader } from "../components/PageHeader";
import { ApiResponse, SerializedPrepTask, StaffSession } from "@/lib/types"; // Added StaffSession
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconAlertCircle } from "@tabler/icons-react";
import { WorkflowCard } from "@/app/components/WorkflowCard"; // Import the card
import { PrepTaskCardActions } from "./components/PrepTaskCardActions"; // Import actions component

// Create a client
const queryClient = new QueryClient();

// Type for filters
type TaskFilter = "my-assigned" | "my-inprogress" | "claimable";

// Wrapper for React Query
export default function MyTasksPageWrapper() {
    return (
        <QueryClientProvider client={queryClient}>
            <MyTasksPage/>
        </QueryClientProvider>
    );
}

// Main page component
function MyTasksPage() {
    const [filter, setFilter] = useState<TaskFilter>("my-assigned");
    const [currentUser, setCurrentUser] = useState<StaffSession | null>(null);

    // Fetch current user session
    useEffect(() => {
        const fetchSession = async () => {
             try {
                const res = await fetch('/api/session');
                const data: ApiResponse<StaffSession> = await res.json();
                if (data.success && data.data) {
                    setCurrentUser(data.data);
                } else {
                    // Handle not logged in? Redirect maybe?
                    notifications.show({title: "Erro", message:"Não foi possível identificar o usuário.", color: "red"})
                }
            } catch (err) {
                 notifications.show({title: "Erro", message:"Erro ao buscar sessão.", color: "red"})
            }
        };
        fetchSession();
    }, []);


    // Fetch Prep Tasks based on filter and user
    const {
        data: tasks,
        isLoading,
        isError,
        error,
        refetch, // Use refetch provided by useQuery
    } = useQuery<SerializedPrepTask[]>({
        queryKey: ['prepTasks', filter, currentUser?.id], // Include user ID in key if fetching 'my' tasks
        queryFn: async () => {
            const params = new URLSearchParams();
            let statusFilter = '';

            switch (filter) {
                case 'my-assigned':
                    params.set('assignedToUserId', 'me');
                    statusFilter = 'ASSIGNED';
                    break;
                case 'my-inprogress':
                     params.set('assignedToUserId', 'me');
                    statusFilter = 'IN_PROGRESS';
                    break;
                case 'claimable':
                    // Fetch unassigned PENDING tasks
                     params.set('assignedToUserId', 'unassigned');
                    statusFilter = 'PENDING';
                    break;
            }
             params.set('status', statusFilter);

            const res = await fetch(`/api/prep-tasks?${params.toString()}`);
            const result: ApiResponse<SerializedPrepTask[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar tarefas de preparo");
            return result.data ?? [];
        },
        enabled: !!currentUser, // Only fetch when currentUser is known
        refetchInterval: 30000, // Refetch every 30 seconds
        refetchIntervalInBackground: true,
    });

    const handleTaskUpdate = () => {
        refetch(); // Refetch the tasks list after an action
    }


    return (
        <Container fluid>
            <Stack gap="lg">
                <PageHeader title="Minhas Tarefas de Preparo" />

                <SegmentedControl
                    value={filter}
                    onChange={(value) => setFilter(value as TaskFilter)}
                    data={[
                        { label: 'Atribuídas a Mim', value: 'my-assigned' },
                        { label: 'Em Progresso', value: 'my-inprogress' },
                        { label: 'Disponíveis', value: 'claimable' },
                    ]}
                    color="blue"
                />

                {isLoading && !tasks && <Center h={200}><Loader /></Center>}
                {isError && (
                    <Alert title="Erro ao Carregar Tarefas" color="red" icon={<IconAlertCircle />}>
                        {(error as Error)?.message}
                    </Alert>
                )}

                {!isLoading && tasks?.length === 0 && (
                    <Text c="dimmed" ta="center" mt="xl">Nenhuma tarefa encontrada para este filtro.</Text>
                )}

                {tasks && tasks.length > 0 && (
                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                       {tasks.map((task) => (
                           <WorkflowCard
                               key={task.id}
                               cardId={task.id}
                               title={task.prepRecipe.name}
                               status={task.status}
                               assignedTo={task.assignedTo}
                               estimatedTime={task.prepRecipe.estimatedLaborTime}
                               // elapsedTime can be calculated based on startedAt if needed
                               details={
                                   <Stack gap={2}>
                                       <Text size="sm">
                                           Produzir: <Text span fw={500}>{task.targetQuantity} {task.prepRecipe.outputIngredient.unit}</Text> de <Text span fw={500}>{task.prepRecipe.outputIngredient.name}</Text>
                                       </Text>
                                        <Text size="xs" c="dimmed">Local: {task.location.name}</Text>
                                        {task.notes && <Text size="xs" c="dimmed">Notas: {task.notes}</Text>}
                                   </Stack>
                               }
                               actions={
                                   <PrepTaskCardActions
                                        task={task}
                                        currentUser={currentUser}
                                        onUpdate={handleTaskUpdate} // Pass refetch function
                                   />
                               }
                           />
                       ))}
                    </SimpleGrid>
                )}

            </Stack>
        </Container>
    );
}