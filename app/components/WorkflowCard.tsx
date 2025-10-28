// PATH: app/components/WorkflowCard.tsx
'use client';

import { SerializedPrepTask } from "@/lib/types";
import { getStatusInfo } from "@/lib/utils";
import { Card, Text, Badge, Group, ActionIcon, Menu, Title, Stack } from "@mantine/core";
import { IconDots, IconEye, IconPlayerPlay, IconCheck, IconPencil, IconTrash, IconX, IconCalendar, IconUser, IconMapPin } from "@tabler/icons-react";
import Link from "next/link";
import dayjs from 'dayjs';

// Define the shape of the data expected by the card
// This can be adapted from SerializedPrepTask or any other object
type CardData = {
    id: string;
    title: string;
    status: string;
    priority?: 'High' | 'Medium' | 'Low' | null;
    assignedTo?: { id: string; name: string } | null;
    dueDate?: string | Date | null;
    location?: { id: string; name: string } | null;
};

// Define the actions available
type CardActions = {
    onUpdateStatus?: (id: string, status: string) => void;
    onAssign?: (id: string) => void;
    onDelete?: (id: string) => void;
    onView?: (id: string) => void; // e.g., open a modal with details
};

// Props for the main component
type WorkflowCardProps = {
    task: SerializedPrepTask; // Use the specific task type
    onUpdateStatus: (id: string, status: string, data?: any) => void; // Make status update more generic
    onAssign: (task: SerializedPrepTask) => void;
    onDelete: (id: string) => void;
};


export function WorkflowCard({ task, onUpdateStatus, onAssign, onDelete }: WorkflowCardProps) {
    
    // Map SerializedPrepTask to CardData
    const cardData: CardData = {
        id: task.id,
        title: `${task.prepRecipe.name} (${task.targetQuantity} ${task.prepRecipe.outputIngredient?.unit ?? ''})`,
        status: task.status,
        priority: null, // PrepTasks don't have priority in the schema yet
        assignedTo: task.assignedTo,
        dueDate: null, // PrepTasks don't have a due date yet
        location: task.location
    };

    const { id, title, status, priority, assignedTo, dueDate, location } = cardData;
    const statusInfo = getStatusInfo(status as any);

    const handleAssignClick = (e: React.MouseEvent) => {
        e.preventDefault(); // Stop propagation if inside a link/button
        onAssign(task);
    };

    // Simplified actions based on task status
    const renderActions = () => {
        switch (task.status) {
            case 'PENDING':
                return (
                    <Menu.Item
                        leftSection={<IconPencil size={14} />}
                        onClick={handleAssignClick} // Use specific handler
                    >
                        Atribuir
                    </Menu.Item>
                );
            case 'ASSIGNED':
                return (
                    <Menu.Item
                        leftSection={<IconPlayerPlay size={14} />}
                        onClick={() => onUpdateStatus(id, 'IN_PROGRESS')}
                    >
                        Iniciar Tarefa
                    </Menu.Item>
                );
            case 'IN_PROGRESS':
                return (
                    <Menu.Item
                        leftSection={<IconCheck size={14} />}
                        onClick={() => onUpdateStatus(id, 'COMPLETED')} // This will likely open the Complete modal
                    >
                        Completar Tarefa
                    </Menu.Item>
                );
            default:
                return null; // No primary actions for COMPLETED, CANCELLED
        }
    };


    return (
        <Card withBorder shadow="sm" padding="md" radius="md">
            <Card.Section withBorder inheritPadding py="xs">
                {/* Header: Title, Status, Priority */}
                <Group justify="space-between" wrap="nowrap">
                    {/* ---- START FIX ---- */}
                    <Title order={5} lineClamp={1}>{title}</Title>
                    {/* ---- END FIX ---- */}
                    <Group gap="xs" wrap="nowrap">
                        {priority && <Badge size="sm" variant="light" color={priority === 'High' ? 'red' : priority === 'Medium' ? 'orange' : 'gray'}>{priority}</Badge>}
                        <Badge color={statusInfo.color} variant="light" size="sm">
                            {statusInfo.label}
                        </Badge>
                    </Group>
                </Group>
            </Card.Section>

            {/* Body: Assignee, Location, Due Date */}
            <Stack gap="xs" py="sm">
                 <Group gap="xs" wrap="nowrap">
                    <IconUser size={16} stroke={1.5} style={{ flexShrink: 0 }} />
                    <Text size="sm" c={assignedTo ? "dimmed" : "gray.5"} truncate>
                        {assignedTo ? assignedTo.name : 'Não atribuído'}
                    </Text>
                </Group>

                 <Group gap="xs" wrap="nowrap">
                    <IconMapPin size={16} stroke={1.5} style={{ flexShrink: 0 }} />
                    <Text size="sm" c="dimmed" truncate>
                        {location?.name ?? 'Localização não definida'}
                    </Text>
                </Group>
                
                {dueDate && (
                    <Group gap="xs" wrap="nowrap">
                         <IconCalendar size={16} stroke={1.5} style={{ flexShrink: 0 }} />
                        <Text size="sm" c="dimmed">
                            {dayjs(dueDate).format('DD/MM/YYYY')}
                        </Text>
                    </Group>
                )}
            </Stack>


            {/* Footer: Actions Menu */}
            <Card.Section withBorder inheritPadding py="xs">
                <Group justify="flex-end">
                    <Menu shadow="md" width={200}>
                        <Menu.Target>
                            <ActionIcon variant="subtle" color="gray">
                                <IconDots size={16} />
                            </ActionIcon>
                        </Menu.Target>

                        <Menu.Dropdown>
                            {renderActions()}
                            
                            <Menu.Divider />
                            
                            {/* Standard actions */}
                            {/* <Menu.Item leftSection={<IconEye size={14} />}>
                                Ver Detalhes
                            </Menu.Item> */}
                            
                            {/* Manager/Owner actions */}
                             {task.status === 'ASSIGNED' && (
                                <Menu.Item
                                    leftSection={<IconX size={14} />}
                                    color="orange"
                                    onClick={() => onUpdateStatus(id, 'PENDING')} // Unassign
                                >
                                    Remover Atribuição
                                </Menu.Item>
                             )}

                            {(task.status === 'PENDING' || task.status === 'ASSIGNED') && (
                                <Menu.Item
                                    leftSection={<IconTrash size={14} />}
                                    color="red"
                                    onClick={() => onDelete(id)}
                                >
                                    Excluir Tarefa
                                </Menu.Item>
                            )}
                        </Menu.Dropdown>
                    </Menu>
                </Group>
            </Card.Section>
        </Card>
    );
}