// PATH: app/dashboard/pan-return/components/DailyConsumptionTrigger.tsx

'use client';

import {
  Button,
  Title,
  Stack,
  Paper,
  Select,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { IconCheck, IconExclamationCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { CompanyClient, DailyConsumptionRecord } from '@prisma/client';
import { DatePickerInput } from '@mantine/dates';
import { toUTC } from '@/lib/utils'; // We'll need to create this helper

/**
 * Helper function to ensure the date sent to the API is a clean UTC date.
 * We should add this to `lib/utils.ts`
 *
 * export function toUTC(date: Date): Date {
 * return new Date(
 * Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
 * );
 * }
 */

type ClientList = Pick<CompanyClient, 'id' | 'companyName'>;

export function DailyConsumptionTrigger() {
  // 1. Fetch company clients for the Select input
  const { data: clients, isPending: isLoadingClients } = useQuery<
    ClientList[]
  >({
    queryKey: ['companyClientsList'],
    queryFn: () => axios.get('/api/company-clients').then((res) => res.data),
  });

  // 2. Form for selecting client and date
  const form = useForm({
    initialValues: {
      companyClientId: '',
      recordDate: new Date(),
    },
    validate: {
      companyClientId: (val) => (val ? null : 'Client is required'),
      recordDate: (val) => (val ? null : 'Date is required'),
    },
  });

  // 3. Mutation to trigger the record creation
  const {
    mutate: generateRecord,
    isPending,
    isSuccess,
    data: generatedRecord,
    isError,
    error,
  } = useMutation<
    DailyConsumptionRecord,
    AxiosError<ErrorResponse>,
    { companyClientId: string; recordDate: Date }
  >({
    mutationFn: (payload) => {
      // Ensure date is sent as a UTC timestamp for that day
      const utcDate = toUTC(payload.recordDate).toISOString();
      return axios
        .post('/api/daily-consumption-records', {
          companyClientId: payload.companyClientId,
          recordDate: utcDate,
        })
        .then((res) => res.data);
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Record Generated',
        message: `Daily consumption record for ${
          clients?.find((c) => c.id === data.companyClientId)?.companyName
        } on ${new Date(data.recordDate).toLocaleDateString()} created/updated.`,
        color: 'green',
        icon: <IconCheck />,
      });
      form.reset();
    },
    onError: (error) => {
      notifications.show({
        title: 'Error Generating Record',
        message:
          error.response?.data?.error || 'An unknown error occurred.',
        color: 'red',
        icon: <IconExclamationCircle />,
      });
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    generateRecord(values);
  };

  const clientSelectData =
    clients?.map((client) => ({
      value: client.id,
      label: client.companyName,
    })) || [];

  return (
    <Paper shadow="md" p="lg" withBorder>
      <Title order={3}>Generate Daily Consumption Record</Title>
      <Text c="dimmed" size="sm" mb="md">
        After all pans for a client are returned for the day, generate this
        record to compile daily totals.
      </Text>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Select
            label="Company Client"
            placeholder="Select a client"
            data={clientSelectData}
            searchable
            required
            disabled={isLoadingClients}
            {...form.getInputProps('companyClientId')}
          />
          <DatePickerInput
            label="Record Date"
            placeholder="Select a date"
            required
            defaultValue={new Date()}
            {...form.getInputProps('recordDate')}
          />
          <Button type="submit" loading={isPending}>
            Generate / Update Daily Record
          </Button>

          {isSuccess && generatedRecord && (
            <Alert color="green" title="Record Updated">
              <Text>
                Delivered:{' '}
                <strong>
                  {String(generatedRecord.deliveredConsumptionKg)} kg
                </strong>
              </Text>
              <Text>
                Consumed:{' '}
                <strong>
                  {String(generatedRecord.actualConsumptionKg)} kg
                </strong>
              </Text>
            </Alert>
          )}

          {isError && (
            <Alert color="red" title="Error">
              {error.response?.data?.error || 'An unknown error occurred.'}
            </Alert>
          )}
        </Stack>
      </form>
    </Paper>
  );
}

// Don't forget to define this type in lib/types.ts or here
type ErrorResponse = {
  error: string;
};