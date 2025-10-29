// PATH: app/dashboard/company-clients/components/ManageCompanyClientModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, TextInput, NumberInput, Select, Textarea, Group, Stack } from '@mantine/core'; // Removed Alert, added Stack
import { useForm } from '@mantine/form';
import { CompanyClientApiResponse } from '../page'; // Assuming correct import path from parent

interface ManageCompanyClientModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: (formData: any) => void; // Prop called when form is valid
  client?: CompanyClientApiResponse | null; // Optional client for editing
  isLoading: boolean; // Loading state from parent mutation
}

// Define valid sales stages
const salesStages = ["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "CLOSED_WON", "CLOSED_LOST"];

export function ManageCompanyClientModal({
    opened,
    onClose,
    onSuccess,
    client,
    isLoading
 }: ManageCompanyClientModalProps) {
  const isEditing = !!client;

  const form = useForm({
    initialValues: {
      companyName: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      cnpj: '',
      addressStreet: '',
      addressNumber: '',
      addressComplement: '',
      addressDistrict: '',
      addressCity: '',
      addressState: '',
      addressZipCode: '',
      // --- START FIX: Initialize as empty string, not null ---
      employeeCount: '' as number | '', // Use '' for empty/cleared NumberInput
      // --- END FIX ---
      consumptionFactor: 1.0 as number | '', // Use 1.0, but type allows ''
      salesPipelineStage: 'LEAD',
      notes: '',
    },
    validate: {
      companyName: (value) => (value.trim() ? null : 'Nome da Empresa é obrigatório'),
      contactPhone: (value) => (value.trim() ? null : 'Telefone de Contato é obrigatório'),
      contactEmail: (value) => (/^\S+@\S+$/.test(value) || !value ? null : 'Email inválido'),
      consumptionFactor: (value) => (value !== '' && Number(value) >= 0 ? null : 'Fator deve ser >= 0'),
      // Validation allows '', null, or number >= 0
      employeeCount: (value) => (value === '' || value === null || Number(value) >= 0 ? null : 'Nº de funcionários deve ser >= 0'),
    },
  });

  useEffect(() => {
    // Only reset or set values when the modal opens
    if (opened) {
      if (client) {
        // Editing: Set form values from client data
        form.setValues({
          companyName: client.companyName || '',
          contactName: client.contactName || '',
          contactPhone: client.contactPhone || '',
          contactEmail: client.contactEmail || '',
          cnpj: client.cnpj || '',
          addressStreet: client.addressStreet || '',
          addressNumber: client.addressNumber || '',
          addressComplement: client.addressComplement || '',
          addressDistrict: client.addressDistrict || '',
          addressCity: client.addressCity || '',
          addressState: client.addressState || '',
          addressZipCode: client.addressZipCode || '',
          // --- START FIX: Convert API's null to form's '' ---
          employeeCount: client.employeeCount === null ? '' : client.employeeCount,
          // --- END FIX ---
          consumptionFactor: client.consumptionFactor ? parseFloat(client.consumptionFactor) : 1.0,
          salesPipelineStage: client.salesPipelineStage || 'LEAD',
          notes: client.notes || '',
        });
      } else {
        // Creating: Reset form to initialValues (which now has '' for employeeCount)
        form.reset();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, opened]); // Rerun effect when modal opens or client changes


  // Internal submit handler - validates and calls the onSuccess prop
  const handleSubmit = (values: typeof form.values) => {
    const payload = {
           ...values,
           // --- START FIX: Convert form's '' back to API's null ---
           employeeCount: values.employeeCount === '' ? null : Number(values.employeeCount),
           // --- END FIX ---
           consumptionFactor: Number(values.consumptionFactor),
    };
    onSuccess(payload); // Call parent's handler
  };

  // Internal close handler
  const handleInternalClose = () => {
      // Don't reset form here, useEffect handles it on open
      onClose(); // Call the parent's onClose function
  }

  return (
    <Modal
      opened={opened}
      onClose={handleInternalClose}
      title={isEditing ? 'Editar Cliente B2B' : 'Criar Cliente B2B'}
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
            <TextInput label="Nome da Empresa" required {...form.getInputProps('companyName')} />
            <TextInput label="Nome do Contato" mt="sm" {...form.getInputProps('contactName')} />
            <TextInput label="Telefone de Contato" required mt="sm" {...form.getInputProps('contactPhone')} />
            <TextInput label="Email de Contato" type="email" mt="sm" {...form.getInputProps('contactEmail')} />
            <TextInput label="CNPJ" mt="sm" {...form.getInputProps('cnpj')} />

            <Group grow mt="sm">
              <TextInput label="Rua" {...form.getInputProps('addressStreet')} />
              <TextInput label="Número" {...form.getInputProps('addressNumber')} />
            </Group>
            <Group grow mt="sm">
                <TextInput label="Complemento" {...form.getInputProps('addressComplement')} />
                <TextInput label="Bairro" {...form.getInputProps('addressDistrict')} />
            </Group>
            <Group grow mt="sm">
                <TextInput label="Cidade" {...form.getInputProps('addressCity')} />
                <TextInput label="Estado (UF)" maxLength={2} {...form.getInputProps('addressState')} />
                <TextInput label="CEP" {...form.getInputProps('addressZipCode')} />
            </Group>

            <Group grow mt="sm">
              <NumberInput
                label="Nº Funcionários"
                min={0}
                step={1}
                allowDecimal={false}
                {...form.getInputProps('employeeCount')}
              />
              <NumberInput
                label="Fator Consumo"
                min={0}
                step={0.1}
                decimalScale={2}
                {...form.getInputProps('consumptionFactor')}
              />
            </Group>

            <Select
              label="Estágio da Venda"
              data={salesStages}
              mt="sm"
              required
              {...form.getInputProps('salesPipelineStage')}
            />

            <Textarea label="Observações" mt="sm" {...form.getInputProps('notes')} />
        </Stack>

        <Group justify="right" mt="xl">
          <Button variant="default" onClick={handleInternalClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" loading={isLoading}>
            {isEditing ? 'Salvar Alterações' : 'Criar Cliente'}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}