import React, { useState } from 'react';
import dayjs from 'dayjs';
import { DatePicker, MiniCalendar } from '@mantine/dates';
import { Accordion, ActionIcon, Group, Stack, Box } from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';

function CombinedCalendarView() {
  const [accordionValue, setAccordionValue] = useState<string | null>(null);
  const today = dayjs();

  // --- CORRECTED PRESETS ---
  // The 'value' for presets in range mode needs to be [string, string]
  // matching the YYYY-MM-DD format, just like your original example.
  const presets = [
    {
      value: [today.subtract(2, 'day').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')] as [string, string],
      label: 'Last two days',
    },
    {
      value: [today.subtract(7, 'day').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')] as [string, string],
      label: 'Last 7 days',
    },
    {
      value: [today.startOf('month').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')] as [string, string],
      label: 'This month',
    },
    {
      value: [
        today.subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
        today.subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
      ] as [string, string],
      label: 'Last month',
    },
    {
      value: [
        today.subtract(1, 'year').startOf('year').format('YYYY-MM-DD'),
        today.subtract(1, 'year').endOf('year').format('YYYY-MM-DD'),
      ] as [string, string],
      label: 'Last year',
    },
  ];
  // --- END OF CORRECTION ---

  const toggleAccordion = () => {
    setAccordionValue((current) => (current === 'monthly-calendar' ? null : 'monthly-calendar'));
  };

  return (
    <Group align="flex-start" wrap="nowrap">
      {/* Weekly MiniCalendar */}
      <Stack gap="xs" align="center">
        <MiniCalendar
          size="xs"
          numberOfDays={7}
          getDayProps={(date) => ({
            style: {
              fontSize: 'var(--mantine-font-size-xs)',
              color: [0, 6].includes(dayjs(date).day()) ? 'var(--mantine-color-red-8)' : undefined,
            },
          })}
        />
        <ActionIcon onClick={toggleAccordion} variant="light" size="lg">
          <IconCalendar size={18} />
        </ActionIcon>
      </Stack>

      {/* Accordion for Monthly DatePicker */}
      <Box style={{ flexGrow: 1 }}>
        <Accordion value={accordionValue} onChange={setAccordionValue}>
          <Accordion.Item value="monthly-calendar">
            <Accordion.Panel>
              <DatePicker
                type="range"
                presets={presets} // Now correctly typed
                // You'll still need state for the actual selected value, e.g.:
                // value={dateRangeValue}
                // onChange={setDateRangeValue}
              />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Box>
    </Group>
  );
}

export default CombinedCalendarView;