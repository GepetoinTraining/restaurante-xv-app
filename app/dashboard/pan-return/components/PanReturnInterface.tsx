// PATH: app/dashboard/pan-return/components/PanReturnInterface.tsx

'use client';

import {
  TextInput,
  Button,
  Box,
  LoadingOverlay,
  Alert,
  Title,
  Stack,
  Text,
  Paper,
  Group,
  NumberInput,
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { useState, useEffect, useRef } from 'react';
import {
  IconBarcode,
  IconCheck,
  IconExclamationCircle,
  IconWeight,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
// --- FIX: Import ErrorResponse here ---
import {
  ActivePanShipmentPayload,
  ErrorResponse,
  PanReturnPayload,
} from '@/lib/types';
import { PanShipment } from '@prisma/client';

export function PanReturnInterface() {
  const queryClient = useQueryClient();
  const [identifierToQuery, setIdentifierToQuery] = useState<string | null>(
    null,
  );

  // This ref is for auto-focusing the weight input after a successful scan
  const weightInputRef = useRef<HTMLInputElement>(null);

  // Form for the initial scan/lookup
  const lookupForm = useForm({
    initialValues: {
      identifier: '',
    },
  });

  // Form for submitting the return weight
  const returnForm = useForm({
    initialValues: {
      inWeightGrams: '',
    },
  });

  // Query to fetch the active shipment based on the pan's identifier
  const {
    data: activePanData,
    isPending: isLookupPending,
    isError: isLookupError,
    error: lookupError,
    refetch: fetchActiveShipment,
    isSuccess: isLookupSuccess,
  } = useQuery<ActivePanShipmentPayload, AxiosError<ErrorResponse>>({
    queryKey: ['activeShipment', identifierToQuery],
    queryFn: () =>
      axios
        .get(`/api/serving-pans/by-identifier/${identifierToQuery}`)
        .then((res) => res.data),
    enabled: false, // Only run manually via refetch()
    retry: false,
    gcTime: 0, // Don't cache results
  });

  // Mutation to log the pan's return
  const {
    mutate: logPanReturn,
    isPending: isReturnPending,
    isSuccess: isReturnSuccess,
    data: returnData,
  } = useMutation<PanShipment, AxiosError<ErrorResponse>, PanReturnPayload>({
    mutationFn: (payload) => {
      const shipmentId = activePanData?.panShipments[0]?.id;
      if (!shipmentId) {
        throw new Error('No active shipment ID found.');
      }
      return axios
        .patch(`/api/pan-shipments/${shipmentId}/return`, payload)
        .then((res) => res.data);
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Return Logged Successfully',
        message: `Calculated waste: ${data.calculatedWasteGrams}g. Pan status set to RETURNED_DIRTY.`,
        color: 'green',
        icon: <IconCheck />,
      });
      // Invalidate queries to refresh data elsewhere
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      // Reset all forms and state
      resetInterface();
    },
    onError: (error) => {
      notifications.show({
        title: 'Error Logging Return',
        message:
          error.response?.data?.error || 'An unknown error occurred.',
        color: 'red',
        icon: <IconExclamationCircle />,
      });
    },
  });

  // Effect to focus the weight input when the shipment is found
  useEffect(() => {
    if (isLookupSuccess && activePanData) {
      weightInputRef.current?.focus();
    }
  }, [isLookupSuccess, activePanData]);

  // Handle the scanner/lookup form submission
  const handleLookupSubmit = (values: { identifier: string }) => {
    if (values.identifier.trim()) {
      setIdentifierToQuery(values.identifier.trim());
      // Wait for state to set, then refetch
      setTimeout(() => fetchActiveShipment(), 0);
    }
  };

  // Handle the return weight form submission
  const handleReturnSubmit = (values: { inWeightGrams: string }) => {
    const weightNum = parseFloat(values.inWeightGrams);
    if (!isNaN(weightNum) && weightNum >= 0) {
      logPanReturn({ inWeightGrams: weightNum });
    } else {
      notifications.show({
        title: 'Invalid Weight',
        message: 'Please enter a valid weight in grams.',
        color: 'yellow',
      });
    }
  };

  // Reset the entire interface
  const resetInterface = () => {
    setIdentifierToQuery(null);
    lookupForm.reset();
    returnForm.reset();
    queryClient.removeQueries({ queryKey: ['activeShipment'] });
  };

  const activeShipment = activePanData?.panShipments[0];
  const panModel = activePanData?.panModel;

  return (
    <Box pos="relative">
      <LoadingOverlay visible={isLookupPending || isReturnPending} />

      {/* --- 1. Scanner / Lookup Input --- */}
      <Paper shadow="md" p="lg" withBorder>
        <Title order={3}>Pan Return & Waste Logging</Title>
        <Text c="dimmed" size="sm" mb="md">
          Scan a pan&apos;s QR code or type its ID and press Enter to find its
          active shipment.
        </Text>

        <form onSubmit={lookupForm.onSubmit(handleLookupSubmit)}>
          <Group align="flex-end">
            <TextInput
              label="Serving Pan Identifier"
              placeholder="Scan QR code or type ID..."
              autoFocus
              required
              leftSection={<IconBarcode size={16} />}
              style={{ flex: 1 }}
              {...lookupForm.getInputProps('identifier')}
              disabled={!!activeShipment} // Disable if a pan is already loaded
            />
            <Button type="submit" disabled={!!activeShipment}>
              Find Pan
            </Button>
            {activeShipment && (
              <Button variant="outline" color="gray" onClick={resetInterface}>
                Clear
              </Button>
            )}
          </Group>
        </form>

        {/* --- 2. Lookup Error Display --- */}
        {isLookupError && (
          <Alert
            title="Pan Not Found"
            color="red"
            icon={<IconExclamationCircle />}
            mt="md"
          >
            {lookupError.response?.data?.error ||
              'An unknown error occurred while fetching the pan.'}
          </Alert>
        )}

        {/* --- 3. Return Weight Form (shown on successful lookup) --- */}
        {activeShipment && panModel && (
          <>
            <Divider my="lg" />
            <form onSubmit={returnForm.onSubmit(handleReturnSubmit)}>
              <Stack>
                <Title order={4}>Log Return for: {panModel.name}</Title>
                <Group grow>
                  <Text>
                    Client:{' '}
                    <strong>
                      {activeShipment.delivery.companyClient.companyName}
                    </strong>
                  </Text>
                  <Text>
                    Delivery Date:{' '}
                    <strong>
                      {new Date(
                        activeShipment.delivery.deliveryDate,
                      ).toLocaleDateString()}
                    </strong>
                  </Text>
                  <Text>
                    Out Weight:{' '}
                    <strong>{String(activeShipment.outWeightGrams)}g</strong>
                  </Text>
                  <Text>
                    Pan Tare Weight:{' '}
                    <strong>{panModel.tareWeightG}g</strong>
                  </Text>
                </Group>

                <Group align="flex-end">
                  <NumberInput
                    label="Return Weight (Pan + Food)"
                    description="Enter the total weight in grams shown on the scale."
                    placeholder="e.g., 1500"
                    required
                    allowDecimal={false}
                    min={0}
                    leftSection={<IconWeight size={16} />}
                    style={{ flex: 1 }}
                    ref={weightInputRef}
                    {...returnForm.getInputProps('inWeightGrams')}
                  />
                  <Button type="submit" color="green" loading={isReturnPending}>
                    Log Return & Calculate Waste
                  </Button>
                </Group>
              </Stack>
            </form>
          </>
        )}

        {/* --- 4. Success Message after return --- */}
        {isReturnSuccess && returnData && (
          <Alert
            title="Success!"
            color="green"
            icon={<IconCheck />}
            mt="md"
          >
            Return logged for Pan ID {returnData.servingPanId}.
            <Text fw={700}>
              Calculated Waste: {String(returnData.calculatedWasteGrams)}g
            </Text>
          </Alert>
        )}
      </Paper>
    </Box>
  );
}