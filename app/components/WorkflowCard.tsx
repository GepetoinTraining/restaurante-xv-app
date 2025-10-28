// PATH: app/components/WorkflowCard.tsx
"use client";

import { Paper, Title, Text, Stack, Group, Badge, Avatar, Box, ActionIcon, Tooltip } from "@mantine/core";
import { IconClock, IconUser, IconInfoCircle } from "@tabler/icons-react";
import React from "react";

// Define potential statuses and their colors/labels
type WorkflowStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'PROBLEM' | string; // Allow custom statuses

const statusConfig: Record<WorkflowStatus, { color: string; label: string }> = {
    PENDING: { color: 'gray', label: 'Pendente' },
    ASSIGNED: { color: 'blue', label: 'Atribuído' },
    IN_PROGRESS: { color: 'yellow', label: 'Em Progresso' },
    COMPLETED: { color: 'green', label: 'Concluído' },
    CANCELLED: { color: 'red', label: 'Cancelado' },
    PROBLEM: { color: 'orange', label: 'Problema' },
    // Add more default statuses or handle custom ones dynamically
};

// Define the props for the WorkflowCard
interface WorkflowCardProps {
    title: string;
    status: WorkflowStatus;
    assignedTo?: { name: string; avatarUrl?: string | null } | null;
    details?: React.ReactNode; // Can be simple text or more complex JSX
    actions?: React.ReactNode; // Buttons or other action elements
    estimatedTime?: number | null; // In minutes
    elapsedTime?: number | null; // In seconds (for timer)
    priority?: 'Low' | 'Medium' | 'High';
    onClick?: () => void; // Optional click handler for the whole card
    cardId: string; // Unique ID for keys etc.
    problemDescription?: string | null; // If status is PROBLEM
}

export function WorkflowCard({
    title,
    status,
    assignedTo,
    details,
    actions,
    estimatedTime,
    elapsedTime,
    priority,
    onClick,
    cardId,
    problemDescription
}: WorkflowCardProps) {
    const statusInfo = statusConfig[status] || { color: 'gray', label: status }; // Fallback for custom statuses

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Paper
            withBorder
            p="md"
            radius="md"
            shadow="sm"
            onClick={onClick}
            style={onClick ? { cursor: 'pointer' } : undefined}
            id={`workflow-card-${cardId}`}
        >
            <Stack gap="sm">
                {/* Header: Title, Status, Priority */}
                <Group justify="space-between" wrap="nowrap">
                    <Title order={5} truncate>{title}</Title>
                    <Group gap="xs" wrap="nowrap">
                        {priority && <Badge size="sm" variant="light" color={priority === 'High' ? 'red' : priority === 'Medium' ? 'orange' : 'gray'}>{priority}</Badge>}
                        <Badge color={statusInfo.color} variant="light" size="sm">
                            {statusInfo.label}
                            {status === 'PROBLEM' && problemDescription && (
                                <Tooltip label={problemDescription} multiline w={220} withArrow position="bottom" >
                                    <ActionIcon variant="transparent" color="orange" size="xs" ml={4}><IconInfoCircle size={12} /></ActionIcon>
                                </Tooltip>
                            )}
                        </Badge>
                    </Group>
                </Group>

                {/* Meta Info: Assigned To, Time */}
                <Group justify="space-between" gap="xs">
                    <Group gap="xs" align="center">
                        {assignedTo ? (
                            <>
                                <Avatar src={assignedTo.avatarUrl} alt={assignedTo.name} size={20} radius="xl" />
                                <Text size="xs" c="dimmed">{assignedTo.name}</Text>
                            </>
                        ) : (
                            <Text size="xs" c="dimmed">Não atribuído</Text>
                        )}
                    </Group>
                    {(estimatedTime || elapsedTime !== null) && (
                         <Group gap={4} align="center">
                            <IconClock size={14} style={{ opacity: 0.7 }}/>
                            {elapsedTime !== null && elapsedTime !== undefined ? (
                                <Text size="xs" c={status === 'IN_PROGRESS' ? 'yellow' : 'dimmed'} fw={status === 'IN_PROGRESS' ? 700 : 400}>
                                    {formatTime(elapsedTime)}
                                </Text>
                            ) : estimatedTime ? (
                                <Text size="xs" c="dimmed">~{estimatedTime} min</Text>
                            ) : null }
                         </Group>
                    )}
                </Group>

                {/* Details Section */}
                {details && (
                    <Box mt="xs">
                        <Text size="sm">{details}</Text>
                    </Box>
                )}

                {/* Actions Section */}
                {actions && (
                    <Group justify="flex-end" mt="sm">
                        {actions}
                    </Group>
                )}
            </Stack>
        </Paper>
    );
}