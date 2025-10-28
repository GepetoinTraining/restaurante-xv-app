// PATH: app/dashboard/live/components/ActiveVisits.tsx
'use client';

import { Paper, Title, Stack, Group, Text, Badge, ActionIcon, Tooltip } from "@mantine/core";
import { LiveVisit } from "../../../api/live/route"; // Import the type from the API route
import { IconUser, IconClock, IconTag, IconMapPin, IconCurrencyDollar, IconEye } from "@tabler/icons-react"; // Added missing imports
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import 'dayjs/locale/pt-br';
import { formatCurrency } from "@/lib/utils";
import Link from "next/link"; // Import Link

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

type ActiveVisitsProps = {
    visits: LiveVisit[];
};

export function ActiveVisits({ visits }: ActiveVisitsProps) {
    return (
        <Paper withBorder shadow="md" p="md">
            <Title order={3}>Visitas Ativas ({visits.length})</Title>
            <Stack gap="md" mt="md">
                {visits.length === 0 && (
                    <Text c="dimmed" fs="italic">Nenhuma visita ativa no momento.</Text>
                )}
                {visits.map((visit) => (
                    <Paper key={visit.id} withBorder p="sm" radius="sm">
                        <Stack gap="xs">
                            <Group justify="space-between">
                                <Text fw={500}>{visit.client.name}</Text>
                                <Tooltip label="Ver detalhes do cliente">
                                    <ActionIcon component={Link} href={`/dashboard/clients/${visit.clientId}`} variant="subtle" size="sm">
                                        <IconEye size={16} />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                            <Group gap="xs">
                                <IconClock size={16} />
                                <Text size="sm" c="dimmed">Check-in: {dayjs(visit.checkInAt).fromNow()}</Text>
                            </Group>
                            {/* --- START FIX --- */}
                            {visit.tab && ( // Check if tab exists before accessing rfid
                                <Group gap="xs">
                                    <IconTag size={16} />
                                    <Text size="sm">Tab: {visit.tab.rfid}</Text>
                                </Group>
                            )}
                            {/* --- END FIX --- */}
                            <Group gap="xs">
                                <IconMapPin size={16} />
                                <Text size="sm">{visit.venueObject?.name || 'Local não definido'}</Text>
                            </Group>
                             <Group gap="xs">
                                <IconCurrencyDollar size={16} />
                                <Text size="sm" fw={500}>Gasto até agora: {formatCurrency(parseFloat(visit.totalSpent))}</Text>
                            </Group>
                        </Stack>
                    </Paper>
                ))}
            </Stack>
        </Paper>
    );
}