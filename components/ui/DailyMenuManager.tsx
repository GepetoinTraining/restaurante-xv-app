// PATH: app/components/ui/DailyMenuManager.tsx
"use client";

import { useState, useEffect } from 'react';
import { Stack, Tabs, Paper, Text, Center } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { IconCalendar } from '@tabler/icons-react';

// For internationalization (pt-BR)
import 'dayjs/locale/pt-br';

// Define the days of the week (Sunday=0, Monday=1, etc.)
const daysOfWeek = [
  { label: 'Dom', value: '0' },
  { label: 'Seg', value: '1' },
  { label: 'Ter', value: '2' },
  { label: 'Qua', value: '3' },
  { label: 'Qui', value: '4' },
  { label: 'Sex', value: '5' },
  { label: 'Sáb', value: '6' },
];

/**
 * A component to display a "Menu of the Day" calendar.
 * It features a DatePicker linked to a set of weekly tabs
 * that show content for the selected day.
 */
export function DailyMenuManager() {
  const [selectedDate, setSelectedDate] = useState<Date | any>(new Date());
  const [activeTab, setActiveTab] = useState<string | any>(
    new Date().getDay().toString()
  );

  // This effect syncs the Tab to the DatePicker
  useEffect(() => {
    if (selectedDate) {
      setActiveTab(selectedDate.getDay().toString());
    }
  }, [selectedDate]);

  // This effect syncs the DatePicker to the Tab
  const handleTabChange = (value: any | null) => {
    if (!value || !selectedDate) return;
    
    setActiveTab(value);
    
    // Find the difference and adjust the date
    const currentDay = selectedDate.getDay();
    const targetDay = parseInt(value, 10);
    const diff = targetDay - currentDay;
    
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + diff);
    setSelectedDate(newDate);
  };

  return (
    <Stack>
      {/* 1. The Date Picker */}
      <Paper withBorder p="xs">
        <DatePicker
          locale="pt-br"
          value={selectedDate}
          onChange={setSelectedDate} 
        />
        <IconCalendar size={16} />
      </Paper>
      
      {/* 2. The Menu for Each Day */}
      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List grow>
          {daysOfWeek.map(day => (
            <Tabs.Tab key={day.value} value={day.value}>
              {day.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {/* 3. The Content Panels */}
        {daysOfWeek.map(day => (
          <Tabs.Panel key={day.value} value={day.value}>
            <Paper withBorder p="md" mih={150}>
              <Text fw={500}>
                Cardápio de {day.label} ({selectedDate?.toLocaleDateString('pt-BR')})
              </Text>
              <Center p="md">
                {/* You would fetch and display the menu here 
                  based on the 'selectedDate'
                */}
                <Text c="dimmed">(Conteúdo do cardápio aqui)</Text>
              </Center>
            </Paper>
          </Tabs.Panel>
        ))}
      </Tabs>
    </Stack>
  );
}