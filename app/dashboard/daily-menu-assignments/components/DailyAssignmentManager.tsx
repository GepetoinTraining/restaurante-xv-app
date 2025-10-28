// PATH: app/dashboard/menu-assignments/components/DailyAssignmentManager.tsx
"use client";

import { useState } from "react";
import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Select,
  Button,
  Loader,
  ScrollArea,
  ActionIcon,
  Tooltip
} from "@mantine/core";
import { IconToolsKitchen2, IconRefresh } from "@tabler/icons-react";
import dayjs from "dayjs";
import { SerializedDailyAssignment } from "../page"; // Import types from page

interface DailyAssignmentManagerProps {
    selectedDate: string; // YYYY-MM-DD
    assignments: SerializedDailyAssignment[];
    companyClients: { id: string; companyName: string; employeeCount: number | null; consumptionFactor: string }[];
    menus: { id: string; name: string }[];
    onAssignMenu: (companyClientId: string, menuId: string | null) => void;
    onGeneratePrepTasks: () => void;
    isAssigning: boolean;
    isGenerating: boolean;
}

export function DailyAssignmentManager({
    selectedDate,
    assignments,
    companyClients,
    menus,
    onAssignMenu,
    onGeneratePrepTasks,
    isAssigning,
    isGenerating
}: DailyAssignmentManagerProps) {

    const menuOptions = [{ label: 'Nenhum Menu', value: '' }, ...menus.map(m => ({ label: m.name, value: m.id }))];

    // Create a map for quick assignment lookup
    const assignmentMap = new Map(assignments.map(a => [a.companyClientId, a.menuId]));

    return (
        <Paper withBorder p="md" radius="md" style={{ flexGrow: 1 }}>
            <Stack>
                <Group justify="space-between">
                    <Title order={3}>Agendamentos para {dayjs(selectedDate).format('DD/MM/YYYY')}</Title>
                     <Tooltip label="Gerar Tarefas de Preparo">
                         <Button
                            onClick={onGeneratePrepTasks}
                            variant="light"
                            color="blue"
                            loading={isGenerating}
                            leftSection={<IconToolsKitchen2 size={16} />}
                         >
                            Gerar Tarefas
                        </Button>
                    </Tooltip>
                </Group>
                 <Text size="sm" c="dimmed">
                    Selecione o menu para cada cliente nesta data. Clique em "Gerar Tarefas" após definir os menus do dia.
                </Text>

                <ScrollArea.Autosize mah={500}>
                    <Stack gap="sm" mt="sm">
                        {companyClients.length === 0 && <Text c="dimmed" ta="center">Nenhum cliente B2B cadastrado.</Text>}
                        {companyClients.map(client => (
                            <Paper key={client.id} p="xs" withBorder radius="sm">
                                <Group grow wrap="nowrap" align="center">
                                    <Stack gap={0} style={{ flexBasis: '40%' }}>
                                        <Text fw={500} truncate>{client.companyName}</Text>
                                        <Text size="xs" c="dimmed">
                                            {client.employeeCount ?? '?'} func. (x{parseFloat(client.consumptionFactor).toFixed(1)})
                                        </Text>
                                    </Stack>
                                    <Select
                                        placeholder="Selecione um menu..."
                                        data={menuOptions}
                                        value={assignmentMap.get(client.id) || ''}
                                        onChange={(value) => onAssignMenu(client.id, value || null)}
                                        disabled={isAssigning}
                                        searchable
                                        clearable
                                        allowDeselect // Allows selecting 'Nenhum Menu'
                                        style={{ flexBasis: '60%' }}
                                        rightSection={isAssigning ? <Loader size="xs"/> : undefined}
                                        comboboxProps={{ withinPortal: false }} // Keep dropdown attached
                                    />
                                </Group>
                            </Paper>
                        ))}
                    </Stack>
                </ScrollArea.Autosize>
            </Stack>
        </Paper>
    );
}
