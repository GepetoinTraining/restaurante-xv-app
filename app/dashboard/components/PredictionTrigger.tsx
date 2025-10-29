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
// --- START FIX: Removed syntax error 'S' ---
import { useForm } from '@mantine/form';
// --- END FIX ---
import { useMutation, useQuery } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { IconBrain, IconExclamationCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { CompanyClient, DailyConsumptionRecord } from '@prisma/client';
import { DatePickerInput } from '@mantine/dates';
import { toUTC } from '@/lib/utils';
// --- START FIX: Import standard ApiResponse type ---
import { ApiResponse } from '@/lib/types';
// --- END FIX ---

type ClientList = Pick<CompanyClient, 'id' | 'companyName'>;

// --- START FIX: Define Serialized record to handle Decimal -> string ---
type SerializedDailyConsumptionRecord = Omit<
  DailyConsumptionRecord,
  'temperatureC' | 'predictedConsumptionKg' | 'actualConsumptionKg'
> & {
  temperatureC: string | null; // Serialized Decimal?
  predictedConsumptionKg: string; // Serialized Decimal
  actualConsumptionKg: string | null; // Serialized Decimal?
};
// --- END FIX ---

type ErrorResponse = {
  error: string;
};

export function PredictionTrigger() {
  // 1. Fetch company clients
  const { data: clients, isLoading: isLoadingClients } = useQuery<
    ClientList[]
  >({
    queryKey: ['companyClientsList'],
    // --- START FIX: Handle ApiResponse wrapper and select only needed fields ---
    queryFn: async () => {
      const res = await axios.get<ApiResponse<CompanyClient[]>>(
        '/api/company-clients'
      );
      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.error || 'Failed to fetch clients');
      }
      // Map to the simple ClientList type
      return res.data.data.map((client) => ({
        id: client.id,
        companyName: client.companyName,
      }));
    },
    // --- END FIX ---
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
    data: generatedRecord, // This will be of type SerializedDailyConsumptionRecord
    isError,
    error,
  } = useMutation<
    SerializedDailyConsumptionRecord, // Expect the serialized type from API
    AxiosError<ErrorResponse>,
    { companyClientId: string; recordDate: Date }
  >({
    mutationFn: async (payload) => {
      const utcDate = toUTC(payload.recordDate).toISOString();
      // --- START FIX: Handle ApiResponse wrapper ---
      const res = await axios.post<ApiResponse<SerializedDailyConsumptionRecord>>(
        '/api/consumption-prediction',
        {
          companyClientId: payload.companyClientId,
          recordDate: utcDate,
        }
      );

      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.error || 'Failed to generate prediction');
      }
      return res.data.data;
      // --- END FIX ---
    },
    // --- START FIX: Removed syntax error 'S' ---
    onSuccess: (data) => {
    // --- END FIX ---
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

  // --- START FIX: Parse serialized strings to numbers for display ---
  const tempC =
    generatedRecord?.temperatureC !== null &&
    generatedRecord?.temperatureC !== undefined
      ? parseFloat(generatedRecord.temperatureC)
      : null;

  const predictedKg = generatedRecord?.predictedConsumptionKg
    ? parseFloat(generatedRecord.predictedConsumptionKg)
    : 0;
  // --- END FIX ---

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
                  {/* --- FIX: Use parsed number for toFixed --- */}
                  {tempC !== null ? `${tempC.toFixed(1)}°C` : 'N/A'}
                </strong>
              </Text>
              <Text>
                Predicted Consumption:{' '}
                <strong>
                  {/* --- FIX: Use parsed number for toFixed --- */}
                  {predictedKg.toFixed(2)} kg
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