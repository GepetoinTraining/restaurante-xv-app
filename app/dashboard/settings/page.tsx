// PATH: app/dashboard/settings/page.tsx
'use client';

import { Container, Title, Text, Paper, Stack, Button } from '@mantine/core';
import { PageHeader } from '../../../components/ui/PageHeader'; // Use the UI library header
import { useDisclosure } from '@mantine/hooks';
import { ViewSettingsModal } from './components/ViewSettingsModal'; // We will create this

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
          
          <Paper withBorder p="xl" mt="lg">
            <Title order={3}>Preferências</Title>
            <Text c="dimmed" mt="md">
              Ajuste como o sistema exibe informações.
            </Text>
            
            <Button onClick={open} mt="lg">
              Mudar Modo de Visualização
            </Button>
          </Paper>

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