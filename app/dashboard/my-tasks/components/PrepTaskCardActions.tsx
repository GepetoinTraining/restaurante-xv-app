// PATH: app/dashboard/my-tasks/components/PrepTaskCardActions.tsx
"use client";

import { Button, Group, LoadingOverlay, Text, Box } from "@mantine/core";
import { IconPlayerPlay, IconPlayerStop, IconThumbUp, IconX, IconHandGrab } from "@tabler/icons-react"; // Added Icons
import { SerializedPrepTask, StaffSession, ApiResponse } from "@/lib/types";
import { PrepTaskStatus } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@mantine/notifications";
import { useState, useEffect } from "react";
import { useDisclosure } from "@mantine/hooks";
import { CompletePrepTaskModal } from "./CompletePrepTaskModal"; // Import the modal

interface PrepTaskCardActionsProps {
    task: SerializedPrepTask;
    currentUser: StaffSession | null;
    onUpdate: () => void; // Callback to refresh the list
}

export function PrepTaskCardActions({ task, currentUser, onUpdate }: PrepTaskCardActionsProps) {
    const queryClient = useQueryClient();
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    const [completeModalOpened, { open: openCompleteModal, close: closeCompleteModal }] = useDisclosure(false);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (task.status === PrepTaskStatus.IN_PROGRESS && task.startedAt) {
            setTimerActive(true);
            const startTime = new Date(task.startedAt).getTime();
            interval = setInterval(() => {
                setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        } else {
            setTimerActive(false);
            setElapsedSeconds(0); // Reset timer if not in progress
        }

        return () => {
            if (interval) clearInterval(interval); // Cleanup interval on unmount or status change
        };
    }, [task.status, task.startedAt]);

    // Mutation for updating task status
    const updateTaskStatus = useMutation<
        ApiResponse<SerializedPrepTask>, // Expected success response
        Error, // Expected error type
        { taskId: string; status: PrepTaskStatus; quantityRun?: string | number } // Variables type
    >({
        mutationFn: ({ taskId, status, quantityRun }) => {
            const body: any = { status };
            if (quantityRun !== undefined) {
                body.quantityRun = quantityRun;
            }
            return fetch(`/api/prep-tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }).then(res => res.json().then(data => {
                if (!res.ok) throw new Error(data.error || `Falha ao atualizar status para ${status}`);
                return data as ApiResponse<SerializedPrepTask>;
            }));
        },
        onSuccess: (data) => {
            if (data.success) {
                notifications.show({ title: 'Sucesso', message: `Tarefa atualizada para ${data.data?.status}!`, color: 'green' });
                // queryClient.invalidateQueries({ queryKey: ['prepTasks'] }); // Invalidate list query
                onUpdate(); // Trigger parent refetch
                if(data.data?.status === PrepTaskStatus.COMPLETED) {
                    queryClient.invalidateQueries({ queryKey: ['aggregatedStock'] }); // Update stock view
                    queryClient.invalidateQueries({ queryKey: ['stockHoldings'] });
                }
            } else {
                notifications.show({ title: 'Erro', message: data.error || 'Falha ao atualizar tarefa', color: 'red' });
            }
        },
        onError: (error) => {
            notifications.show({ title: 'Erro na Atualização', message: error.message, color: 'red' });
        },
    });

    if (!currentUser) return null; // Don't render actions if user is unknown

    const isManagerOrOwner = ['MANAGER', 'OWNER'].includes(currentUser.role);
    const isAssignedToMe = task.assignedToUserId === currentUser.id;

    // --- Determine Button Visibility ---
    const canClaim = task.status === PrepTaskStatus.PENDING;
    const canStart = task.status === PrepTaskStatus.ASSIGNED && (isAssignedToMe || isManagerOrOwner);
    const canComplete = task.status === PrepTaskStatus.IN_PROGRESS && (isAssignedToMe || isManagerOrOwner);
    // Add cancel logic later if needed

    return (
        <>
             {/* Timer Display - Absolute position can be tricky, maybe just inline */}
             {timerActive && (
                <Text size="xs" c="yellow" fw={700} ta="right" mb={-5} /* Adjust spacing */>
                    {Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
                </Text>
             )}

             {/* Action Buttons */}
            <Group justify="flex-end" pos="relative">
                <LoadingOverlay visible={updateTaskStatus.isPending} overlayProps={{ blur: 1, radius: 'sm' }} />

                {canClaim && (
                    <Button
                        size="xs"
                        variant="outline"
                        leftSection={<IconHandGrab size={14} />}
                        onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: PrepTaskStatus.IN_PROGRESS })} // Claim sets to IN_PROGRESS directly
                        disabled={updateTaskStatus.isPending}
                    >
                        Assumir
                    </Button>
                )}
                {canStart && (
                     <Button
                        size="xs"
                        variant="filled"
                        color="yellow"
                        leftSection={<IconPlayerPlay size={14} />}
                        onClick={() => updateTaskStatus.mutate({ taskId: task.id, status: PrepTaskStatus.IN_PROGRESS })}
                        disabled={updateTaskStatus.isPending}
                    >
                        Iniciar
                    </Button>
                )}
                {canComplete && (
                    <Button
                        size="xs"
                        variant="filled"
                        color="green"
                        leftSection={<IconThumbUp size={14} />}
                        onClick={openCompleteModal} // Open modal first
                        disabled={updateTaskStatus.isPending}
                    >
                        Concluir
                    </Button>
                )}
                {/* Add Cancel Button later if needed */}
            </Group>

            {/* Completion Modal */}
            <CompletePrepTaskModal
                opened={completeModalOpened}
                onClose={closeCompleteModal}
                task={task}
                onSubmit={(actualQuantity) => {
                    updateTaskStatus.mutate({ taskId: task.id, status: PrepTaskStatus.COMPLETED, quantityRun: actualQuantity });
                    closeCompleteModal();
                }}
            />
        </>
    );
}