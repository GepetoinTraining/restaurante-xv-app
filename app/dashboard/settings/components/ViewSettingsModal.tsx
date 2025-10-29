// PATH: app/dashboard/settings/components/ViewSettingsModal.tsx
"use client";

import { Modal, Tabs, Button, Group, LoadingOverlay, Stack, Box, ScrollArea, Center, Table, Text } from '@mantine/core';
import { useLocalStorage, useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import { 
  StandardCard, 
  StandardTable, 
  AsymmetricalGrid 
} from '../../../../components/ui'; // Import our new UI library
import { IconLayoutGrid, IconTable, IconLayoutList } from '@tabler/icons-react';

interface ViewSettingsModalProps {
  opened: boolean;
  onClose: () => void;
}

// Define the view preference type
type ViewPreference = 'cards' | 'table' | 'grid';

export function ViewSettingsModal({ opened, onClose }: ViewSettingsModalProps) {
  // 1. Hook for persistent storage
  const [viewPreference, setViewPreference] = useLocalStorage<ViewPreference>({
    key: 'user-view-preference',
    defaultValue: 'cards',
  });

  // 2. State for the tab selection (before saving)
  const [activeTab, setActiveTab] = useState<string | null>(viewPreference);
  
  // 3. State for the loading spinner
  const [isSaving, { open: showLoader, close: hideLoader }] = useDisclosure(false);

  const handleSave = () => {
    if (!activeTab) return;

    showLoader(); // Show the spinning wheel

    // Simulate a reload/API call
    setTimeout(() => {
      setViewPreference(activeTab as ViewPreference); // Save the preference
      hideLoader(); // Hide the spinner
      onClose(); // Close the modal
      
      // In a real app, you might force a refresh to apply the style
      // window.location.reload(); 
    }, 1500); // 1.5 second simulation
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Escolha seu modo de visualização"
      size="xl"
    >
      <Box pos="relative">
        <LoadingOverlay visible={isSaving} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
        
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow>
            <Tabs.Tab value="cards" leftSection={<IconLayoutList size={16} />}>
              Modo Lista (Cartões)
            </Tabs.Tab>
            <Tabs.Tab value="grid" leftSection={<IconLayoutGrid size={16} />}>
              Modo Grade
            </Tabs.Tab>
            <Tabs.Tab value="table" leftSection={<IconTable size={16} />}>
              Modo Tabela
            </Tabs.Tab>
          </Tabs.List>

          <Box p="md" bg="var(--mantine-color-gray-0)" style={{ minHeight: 300 }}>
            <Tabs.Panel value="cards">
              <ScrollArea h={300}>
                <Stack>
                  <StandardCard title="Exemplo de Cartão 1"><Text>Conteúdo...</Text></StandardCard>
                  <StandardCard title="Exemplo de Cartão 2"><Text>Conteúdo...</Text></StandardCard>
                  <StandardCard title="Exemplo de Cartão 3"><Text>Conteúdo...</Text></StandardCard>
                </Stack>
              </ScrollArea>
            </Tabs.Panel>

            <Tabs.Panel value="grid">
              <ScrollArea h={300}>
                <AsymmetricalGrid>
                  {[...Array(7)].map((_, i) => (
                    <StandardCard key={i} title={`Item ${i+1}`}><Text>...</Text></StandardCard>
                  ))}
                </AsymmetricalGrid>
              </ScrollArea>
            </Tabs.Panel>

            <Tabs.Panel value="table">
              <ScrollArea h={300}>
                <StandardTable
                  headers={['Nome', 'Status', 'Preço']}
                  isLoading={false}
                  isEmpty={false}
                >
                  <tr><td>Item 1</td><td>Ativo</td><td>R$ 10,00</td></tr>
                  <tr><td>Item 2</td><td>Inativo</td><td>R$ 20,00</td></tr>
                  <tr><td>Item 3</td><td>Ativo</td><td>R$ 30,00</td></tr>
                </StandardTable>
              </ScrollArea>
            </Tabs.Panel>
          </Box>
        </Tabs>
        
        <Group justify="flex-end" mt="xl">
          <Button variant="default" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            Salvar e Aplicar
          </Button>
        </Group>
      </Box>
    </Modal>
  );
}