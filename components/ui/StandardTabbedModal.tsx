// PATH: app/components/ui/StandardTabbedModal.tsx
"use client";

import { Modal, ModalProps, Tabs } from '@mantine/core';
import { ReactNode, useState } from 'react';

// Define the shape of a single tab
export interface TabData {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
  content: ReactNode;
}

interface StandardTabbedModalProps extends Omit<ModalProps, 'children'> {
  tabs: TabData[];
}

export function StandardTabbedModal({ tabs, ...props }: StandardTabbedModalProps) {
  // Use the first tab as the default, or null if empty
  const [activeTab, setActiveTab] = useState(tabs[0]?.value || null);

  return (
    <Modal {...props}>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List grow>
          {tabs.map(tab => (
            <Tabs.Tab key={tab.value} value={tab.value} leftSection={tab.icon}>
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {tabs.map(tab => (
          <Tabs.Panel key={tab.value} value={tab.value} pt="md">
            {tab.content}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Modal>
  );
}