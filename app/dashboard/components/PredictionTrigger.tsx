// PATH: app/dashboard/components/PredictionTrigger.tsx

'use client';

import {
  Button,
  Title,
  Stack,
  Paper,
  Select,
  Alert,
  Text,
} from '@mantine/core';
import { useForm }S from '@mantine/form';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { IconCheck, IconExclamationCircle, IconBrain } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { CompanyClient, DailyConsumptionRecord } from '@prisma/client';
import { DatePickerInput } from '@mantine/dates';
import { toUTC } from '@/lib/utils'; // Re-using our trusted helper

type ClientList = Pick<CompanyClient, 'id' | 'companyName'>;
type ErrorResponse = {
  error: string;
};

export function PredictionTrigger() {
  // 1. Fetch company clients for the Select input
  const { data: clients, isLoading: isLoadingClients } = useQuery<
    ClientList[]
  >({
    queryKey: ['companyClientsList'],
    queryFn: () => axios.get('/api/company-clients').then((res) => res.data),
  });

  // 2. Form for selecting client and date
  const form = useForm({
    initialValues: {
      companyClientId: '',
      recordDate: new Date(new Date().setDate(new Date().getDate() + 1)), // Default to tomorrow
    },
    validate: {
      companyClientId: (val) => (val ? null : 'Client is required'),
      recordDate: (val) => (val ? null : 'Date is required'),
    },
  });

  // 3. Mutation to trigger the record creation
  const {
    mutate: generatePrediction,
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
        .post('/api/consumption-prediction', {
          companyClientId: payload.companyClientId,
          recordDate: utcDate,
        })
        .then((res) => res.data);
    },
    onSuccess: (data)S => {
      notifications.show({
        title: 'Prediction Generated (V1)',
        message: `Prediction for ${
          clients?.find((c) => c.id === data.companyClientId)?.companyName
        } on ${new Date(data.recordDate).toLocaleDateString()} created/updated.`,
        color: 'cyan',
        icon: <IconBrain />,
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error Generating Prediction',
        message:
          error.response?.data?.error || 'An unknown error occurred.',
        color: 'red',
        icon: <IconExclamationCircle />,
      });
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    generatePrediction(values);
  };

  const clientSelectData =
    clients?.map((client) => ({
      value: client.id,
      label: client.companyName,
    })) || [];

  return (
    <Paper shadow="md" p="lg" withBorder>
      <Title order={3}>Generate Consumption Prediction (V1)</Title>
      <Text c="dimmed" size="sm" mb="md">
        Select a client and date (usually tomorrow) to fetch weather
        and generate a consumption prediction.
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
            label="Prediction Date"
            placeholder="Select a date"
            required
            {...form.getInputProps('recordDate')}
          />
          <Button
            type="submit"
            loading={isPending}
            leftSection={<IconBrain size={16} />}
          >
            Generate / Update Prediction
          </Button>

          {isSuccess && generatedRecord && (
            <Alert color="cyan" title="Prediction Saved">
              <Text>
                Weather:{' '}
                <strong>
                  {generatedRecord.weatherCondition},{' '}
                  {generatedRecord.temperatureC?.toFixed(1)}°C
                </strong>
              </Text>
              <Text>
                Predicted Consumption:{' '}
                <strong>
                  {String(generatedRecord.predictedConsumptionKg)} kg
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