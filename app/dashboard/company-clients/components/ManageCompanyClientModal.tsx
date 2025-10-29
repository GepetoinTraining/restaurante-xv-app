// PATH: app/dashboard/company-clients/components/ManageCompanyClientModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, TextInput, NumberInput, Select, Textarea, Group, Alert } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ApiResponse } from '@/lib/types';
import { SerializedCompanyClientWithId } from '../page'; // Assuming correct import path

interface ManageCompanyClientModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: SerializedCompanyClientWithId | null; // Optional client for editing
}

// Define valid sales stages if you want stricter validation (optional)
const salesStages = ["Prospect", "Lead", "Negotiation", "Active", "Lost", "Inactive"];

export function ManageCompanyClientModal({ opened, onClose, onSuccess, client }: ManageCompanyClientModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      employeeCount: null as number | null, // Use number for Mantine NumberInput
      consumptionFactor: 1.0, // Use number for Mantine NumberInput
      salesPipelineStage: 'Lead',
      notes: '',
    },
    validate: {
      companyName: (value) => (value.trim() ? null : 'Nome da Empresa é obrigatório'),
      contactPhone: (value) => (value.trim() ? null : 'Telefone de Contato é obrigatório'),
      contactEmail: (value) => (/^\S+@\S+$/.test(value) || !value ? null : 'Email inválido'),
      consumptionFactor: (value) => (value !== null && value >= 0 ? null : 'Fator deve ser >= 0'),
      employeeCount: (value) => (value === null || value >= 0 ? null : 'Número de funcionários deve ser >= 0'),
    },
  });

  useEffect(() => {
    if (client) {
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
        employeeCount: client.employeeCount ?? null,
        // --- START FIX: Parse consumptionFactor string back to number ---
        consumptionFactor: client.consumptionFactor ? parseFloat(client.consumptionFactor) : 1.0,
        // --- END FIX ---
        salesPipelineStage: client.salesPipelineStage || 'Lead',
        notes: client.notes || '',
      });
    } else {
      form.reset();
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const handleSubmit = async (values: typeof form.values) => {
    setIsLoading(true);
    setError(null);
    const apiUrl = isEditing ? `/api/company-clients/${client?.id}` : '/api/company-clients';
    const method = isEditing ? 'PATCH' : 'POST';

    try {
      const res = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           ...values,
           // --- START FIX (ts(2367)): Adjusted check for employeeCount ---
           // If employeeCount is null, undefined, 0, or '', send null. Otherwise, send the number.
           // This avoids the direct comparison between number and string ('').
           employeeCount: !values.employeeCount ? null : Number(values.employeeCount),
           // --- END FIX ---
           consumptionFactor: Number(values.consumptionFactor),
        }),
      });

      const data: ApiResponse = await res.json();

      if (data.success) {
        notifications.show({
          title: 'Sucesso!',
          message: `Cliente ${isEditing ? 'atualizado' : 'criado'} com sucesso.`,
          color: 'green',
        });
        onSuccess();
        handleCloseModal();
      } else {
        setError(data.error || `Falha ao ${isEditing ? 'atualizar' : 'criar'} cliente.`);
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={isEditing ? 'Editar Cliente Corporativo' : 'Criar Cliente Corporativo'}
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        {error && (
          <Alert color="red" title="Erro" mt="md" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

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
           <NumberInput label="Nº Funcionários" min={0} step={1} {...form.getInputProps('employeeCount')} />
           <NumberInput label="Fator Consumo" min={0} step={0.1} decimalScale={2} {...form.getInputProps('consumptionFactor')} />
        </Group>

        <Select
          label="Estágio da Venda"
          data={salesStages}
          mt="sm"
          {...form.getInputProps('salesPipelineStage')}
        />

        <Textarea label="Observações" mt="sm" {...form.getInputProps('notes')} />


        <Group justify="right" mt="xl">
          <Button variant="default" onClick={handleClose} loading={isLoading}>
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