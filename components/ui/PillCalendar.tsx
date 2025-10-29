"use client";

// Use CDN imports for environments that can't resolve node_modules
import { Calendar, type CalendarProps } from '@mantine/dates';
import { Indicator, Stack, Text, Pill, UnstyledButton } from '@mantine/core';
import 'dayjs/locale/pt-br';

// Define what a pill's data looks like
export interface PillEvent {
  id: string;
  label: string;
  color?: string; // Mantine color (e.g., "blue", "myColor")
}

// The main data prop
interface PillCalendarProps extends Omit<CalendarProps, 'renderDay' | 'getDayProps' | 'slots' | 'slot'> {
  /** Key: YYYY-MM-DD */
  data: Record<string, PillEvent[]>;
}

/**
 * A calendar that renders a stack of up to 5 pills
 * for any day that has associated data.
 *
 * This component uses the `slot` prop to completely replace the
 * default `Day` component, bypassing type errors related to `renderDay`.
 */
export function PillCalendar({ data, ...props }: PillCalendarProps) {
  
  /**
   * This is our custom replacement for Mantine's `Day` component.
   * It receives all the props that `Day` would normally receive.
   */
  const CustomDay = (dayProps: any) => {
    // Destructure all the props passed from Calendar
    const {
      date: dateString, // This will be the YYYY-MM-DD string
      disabled,
      outside,
      selected,
      inRange,
      firstInRange,
      lastInRange,
      weekend,
      // We also get 'onClick', 'onMouseEnter', etc., automatically
      ...otherDayProps 
    } = dayProps;

    // --- Logic from our old `renderDay` ---
    const day = dateString ? parseInt(dateString.split('-')[2], 10) : '';
    const dayEvents = data[dateString] || [];

    // --- Logic from our old `getDayProps` ---
    const isOutside = outside;
    const style = { 
      minHeight: 90, 
      alignItems: 'flex-start', 
      paddingTop: 6,
      opacity: isOutside ? 0.4 : 1,
      // Ensure the button fills the cell
      width: '100%', 
      height: '100%',
      pointerEvents: disabled ? 'none' : undefined,
    };

    return (
      <UnstyledButton
        {...otherDayProps}
        style={style}
        disabled={disabled}
        // Re-apply all the data attributes for styling
        data-disabled={disabled || undefined}
        data-outside={outside || undefined}
        data-selected={selected || undefined}
        data-in-range={(inRange && !disabled) || undefined}
        data-first-in-range={(firstInRange && !disabled) || undefined}
        data-last-in-range={(lastInRange && !disabled) || undefined}
        data-weekend={(weekend && !disabled && !outside) || undefined}
      >
        <Indicator size={6} color="blue" offset={8} disabled={dayEvents.length === 0}>
          <div>
            <Text size="sm">{day}</Text>
            
            {dayEvents.length > 0 && (
              <Stack gap={2} mt={2}>
                {dayEvents.slice(0, 5).map((event) => (
                  <Pill
                    key={event.id}
                    size="xs"
                    color={event.color || 'gray'}
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
                  >
                    {event.label}
                  </Pill>
                ))}
                {dayEvents.length > 5 && (
                  <Text size="xs" c="dimmed" ta="center">...</Text>
                )}
              </Stack>
            )}
          </div>
        </Indicator>
      </UnstyledButton>
    );
  };

  return (
    <Calendar
      locale="pt-br"
      // Use the `slot` prop (as `any`) to replace the `day` component
      // This is a workaround for the environment's type-checking
      slot={{ day: CustomDay } as any}
      {...props}
    />
  );
}

