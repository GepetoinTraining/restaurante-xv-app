// PATH: app/components/WorkflowCard.tsx
'use client';

import { SerializedPrepTask } from "@/lib/types";
import { getStatusInfo } from "@/lib/utils";
import { Card, Text, Badge, Group, ActionIcon, Menu, Title, Stack } from "@mantine/core";
import { IconDots, IconUserCheck, IconPlayerPlay, IconCheck, IconX, IconTrash, IconCalendarTime, IconUser, IconMapPin, IconClockHour4, IconUserX } from "@tabler/icons-react"; // Added more icons
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');


// Props for the main component
type WorkflowCardProps = {
    task: SerializedPrepTask;
    onUpdateStatus: (id: string, status: string, data?: any) => void; // Allow passing extra data (like assignedToUserId)
    onAssign: (task: SerializedPrepTask) => void; // Opens the assign modal
    onDelete: (task: SerializedPrepTask) => void; // Pass full task for confirmation message
};


export function WorkflowCard({ task, onUpdateStatus, onAssign, onDelete }: WorkflowCardProps) {

    const { id, prepRecipe, targetQuantity, status, assignedTo, location, createdAt, assignedAt, startedAt, completedAt } = task;
    const statusInfo = getStatusInfo(status);

    // Safely access potentially null properties for display
    const recipeName = prepRecipe?.name ?? 'Receita Desconhecida';
    const outputUnit = prepRecipe?.outputIngredient?.unit ?? 'UN';
    const outputIngredientName = prepRecipe?.outputIngredient?.name ?? 'Item Preparado';
    const locationName = location?.name ?? 'Local Desconhecido';
    const estimatedTime = prepRecipe?.estimatedLaborTime;


    // --- Action Handlers ---
    const handleAssignClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onAssign(task);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
         e.preventDefault();
         onDelete(task);
    }

    const handleUnassignClick = (e: React.MouseEvent) => {
         e.preventDefault();
         // Set status to PENDING and remove assignedToUserId
         onUpdateStatus(id, 'PENDING', { assignedToUserId: null });
    }

    const handleCancelClick = (e: React.MouseEvent) => {
         e.preventDefault();
         if (confirm(`Tem certeza que deseja cancelar a tarefa "${recipeName}"?`)) {
             onUpdateStatus(id, 'CANCELLED');
         }
    }

    // Determine primary action based on status
    const renderPrimaryAction = () => {
        switch (status) {
            case 'PENDING':
                return (
                    <Menu.Item
                        leftSection={<IconUserCheck size={14} />}
                        onClick={handleAssignClick}
                    >
                        Atribuir Tarefa
                    </Menu.Item>
                );
            case 'ASSIGNED':
                // Check if assigned to current user might be complex here, rely on "My Tasks" page
                // Or maybe show "Start" for anyone (Manager/Owner override?)
                 return (
                    <Menu.Item
                        leftSection={<IconPlayerPlay size={14} />}
                        onClick={() => onUpdateStatus(id, 'IN_PROGRESS')}
                    >
                        Iniciar Tarefa
                    </Menu.Item>
                 );
            case 'IN_PROGRESS':
                // Completion logic is usually handled on "My Tasks" or Execute modal
                 return (
                    <Menu.Item
                        leftSection={<IconCheck size={14} />}
                        onClick={() => onUpdateStatus(id, 'COMPLETED')} // Triggers modal/logic in parent
                    >
                        Completar Tarefa
                    </Menu.Item>
                 );
            default:
                return null; // No primary actions for COMPLETED, CANCELLED, PROBLEM
        }
    };


    return (
        <Card withBorder shadow="sm" padding="md" radius="md" h="100%">
            <Stack justify="space-between" h="100%">
                {/* Header Section */}
                <Card.Section withBorder inheritPadding py="xs">
                    <Group justify="space-between" wrap="nowrap">
                        <Title order={5} lineClamp={2}>
                            {recipeName} ({targetQuantity} {outputUnit})
                        </Title>
                        <Badge color={statusInfo.color} variant="light" size="sm" style={{ flexShrink: 0 }}>
                            {statusInfo.label}
                        </Badge>
                    </Group>
                    {estimatedTime && (
                         <Group gap="xs" mt={3}>
                            <IconClockHour4 size={14} stroke={1.5} opacity={0.7}/>
                            <Text size="xs" c="dimmed">Estimado: {estimatedTime} min</Text>
                         </Group>
                    )}
                </Card.Section>

                {/* Body: Assignee, Location, Timestamps */}
                <Stack gap={6} py="sm">
                    <Group gap="xs" wrap="nowrap">
                        <IconUser size={16} stroke={1.5} style={{ flexShrink: 0 }} opacity={0.7} />
                        <Text size="sm" c={assignedTo ? "dimmed" : "gray.6"} truncate>
                            {assignedTo ? assignedTo.name : 'Não atribuído'}
                        </Text>
                    </Group>

                    <Group gap="xs" wrap="nowrap">
                        <IconMapPin size={16} stroke={1.5} style={{ flexShrink: 0 }} opacity={0.7} />
                        <Text size="sm" c="dimmed" truncate>
                            {locationName}
                        </Text>
                    </Group>

                     {/* Display relevant timestamp */}
                     <Group gap="xs" wrap="nowrap">
                         <IconCalendarTime size={16} stroke={1.5} style={{ flexShrink: 0 }} opacity={0.7}/>
                         <Text size="xs" c="dimmed">
                            {status === 'COMPLETED' && completedAt ? `Concluído ${dayjs(completedAt).fromNow()}` :
                             status === 'IN_PROGRESS' && startedAt ? `Iniciado ${dayjs(startedAt).fromNow()}` :
                             status === 'ASSIGNED' && assignedAt ? `Atribuído ${dayjs(assignedAt).fromNow()}` :
                             `Criado ${dayjs(createdAt).fromNow()}`
                            }
                         </Text>
                     </Group>

                </Stack>


                {/* Footer: Actions Menu */}
                <Card.Section withBorder inheritPadding py={5}> {/* Reduced padding */}
                    <Group justify="flex-end">
                        <Menu shadow="md" width={200} withinPortal>
                            <Menu.Target>
                                <ActionIcon variant="subtle" color="gray">
                                    <IconDots size={16} />
                                </ActionIcon>
                            </Menu.Target>

                            <Menu.Dropdown>
                                {renderPrimaryAction()}
                                {(status === 'PENDING' || status === 'ASSIGNED') && <Menu.Divider />}

                                {/* Secondary / Manager Actions */}
                                {status === 'ASSIGNED' && (
                                    <Menu.Item
                                        leftSection={<IconUserX size={14} />}
                                        color="orange"
                                        onClick={handleUnassignClick}
                                    >
                                        Remover Atribuição
                                    </Menu.Item>
                                )}

                                {(status === 'PENDING' || status === 'ASSIGNED' || status === 'IN_PROGRESS') && ( // Allow cancelling IN_PROGRESS? Maybe only managers?
                                    <Menu.Item
                                        leftSection={<IconX size={14} />}
                                        color="red"
                                        onClick={handleCancelClick}
                                    >
                                        Cancelar Tarefa
                                    </Menu.Item>
                                )}

                                {/* Delete should probably be manager only and have confirmation */}
                                {(status === 'PENDING' || status === 'ASSIGNED' || status === 'CANCELLED' || status === 'PROBLEM') && ( // Can delete if not started or already finished/cancelled
                                     <Menu.Item
                                        leftSection={<IconTrash size={14} />}
                                        color="red"
                                        onClick={handleDeleteClick}
                                    >
                                        Excluir Tarefa
                                    </Menu.Item>
                                )}
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Card.Section>
            </Stack>
        </Card>
    );
}

