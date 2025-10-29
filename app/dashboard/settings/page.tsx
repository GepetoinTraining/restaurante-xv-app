// PATH: app/dashboard/settings/page.tsx
'use client';

import { Container, Title, Text, Paper, Stack, Button, Grid } from '@mantine/core';
import { PageHeader } from '../../../components/ui/PageHeader'; // Use the UI library header
import { useDisclosure } from '@mantine/hooks';
import { ViewSettingsModal } from './components/ViewSettingsModal';
import { PillCalendar, PillEvent } from '../../../components/ui/PillCalendar'; // Import the new calendar
import { CombinedCalendar } from '../../../components/ui/CombinedCalendar'; // Import the combined calendar view
import dayjs from 'dayjs';
import { PlusCircleIcon } from 'lucide-react';

// Mock data for the calendar
const mockCalendarData: Record<string, PillEvent[]> = {
  [dayjs().format('YYYY-MM-DD')]: [
    { id: '1', label: 'Hoje', color: 'brandGreen' },
  ],
  [dayjs().add(1, 'day').format('YYYY-MM-DD')]: [
    { id: '2', label: 'Entrega', color: 'blue' },
    { id: '3', label: 'Reunião', color: 'yellow' },
  ],
  [dayjs().add(3, 'day').format('YYYY-MM-DD')]: [
    { id: '4', label: 'Folga', color: 'gray' },
  ],
};

export default function SettingsPage() {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Container fluid>
        <Stack>
          <PageHeader
            title="Configurações"
            description="Ajuste suas preferências de visualização e conta."
          />
          
          {/* Calendar Card */}
          <Grid grow mt="lg">
          <Grid.Col span={2}>
          <Paper withBorder p="xl" mt="lg">
            <Title order={3}>Calendário de Eventos</Title>
            <Text c="dimmed" mt="md" mb="lg">
              Sua agenda pessoal de tarefas e eventos.
            </Text>
            <PillCalendar data={mockCalendarData} />
          </Paper>
          <CombinedCalendar data={mockCalendarData} />
          </Grid.Col>
          </Grid>

          {/* Preferences Card */}
          <Paper withBorder p="xl" mt="lg">
            <Title order={3}>Preferências</Title>
            <Text c="dimmed" mt="md">
              Ajuste como o sistema exibe informações.
            </Text>
            
            <Button onClick={open} mt="lg">
              Mudar Modo de Visualização
            </Button>
          </Paper>

          {/* Account Card */}
          <Paper withBorder p="xl" mt="lg">
             <Title order={3}>Conta</Title>
             <Text c="dimmed" mt="md">
                Em breve: Mudar PIN, alterar dados de usuário.
             </Text>
          </Paper>

        </Stack>
      </Container>

      {/* The Modal itself is called here */}
      <ViewSettingsModal opened={opened} onClose={close} />
    </>
  );
}