// PATH: app/components/ui/StandardCalendar.tsx
"use client";

import { Calendar, CalendarProps } from '@mantine/dates';
import 'dayjs/locale/pt-br'; // Ensure localization is loaded

/**
 * A standardized, full-size calendar component.
 * It's a simple wrapper around Mantine's Calendar for consistent styling.
 */
export function StandardCalendar(props: CalendarProps) {
  return (
    <Calendar
      locale="pt-br"
      // You can add other defaults here, like size="lg"
      {...props}
    />
  );
}