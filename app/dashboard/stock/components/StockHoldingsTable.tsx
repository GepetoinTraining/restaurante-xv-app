// PATH: app/dashboard/stock/components/StockHoldingsTable.tsx
"use client";

import {
  Table,
  Text,
  Center,
  Loader,
  Badge,
  ActionIcon,
  Group,
  TextInput,
  Select,
  Button,
  Stack,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { ApiResponse, SerializedStockHolding } from "@/lib/types";
import { IconAdjustments, IconTrash, IconSearch, IconFilter, IconX, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { notifications } from "@mantine/notifications";
import { AdjustStockHoldingModal } from "./AdjustStockHoldingModal"; // Import the modal
import { SerializedIngredientDef } from "../../ingredients/page"; // Use definition type

type StockLocation = { id: string; name: string };

type StockHoldingsTableProps = {
    ingredientDefs: SerializedIngredientDef[]; // For Add Stock button
    locations: StockLocation[]; // For filtering
    onAddStockClick: (ingredient: SerializedIngredientDef) => void; // To open AddStockHoldingModal
}

// Helper to fetch holdings with filters
const fetchHoldings = async (ingredientId?: string | null, locationId?: string | null): Promise<SerializedStockHolding[]> => {
    const params = new URLSearchParams();
    if (ingredientId) params.append('ingredientId', ingredientId);
    if (locationId) params.append('venueObjectId', locationId); // API expects venueObjectId

    const res = await fetch(`/api/stock-holdings?${params.toString()}`);
    const result: ApiResponse<SerializedStockHolding[]> = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar lotes de estoque");
    return result.data!;
};

export function StockHoldingsTable({ ingredientDefs, locations, onAddStockClick }: StockHoldingsTableProps) {
    const queryClient = useQueryClient();
    const [selectedIngredientFilter, setSelectedIngredientFilter] = useState<string | null>(null);
    const [selectedLocationFilter, setSelectedLocationFilter] = useState<string | null>(null);
    const [modalOpened, setModalOpened] = useState(false);
    const [holdingToAdjust, setHoldingToAdjust] = useState<SerializedStockHolding | null>(null);

    const {
        data: holdings,
        isLoading,
        isError,
        error,
    } = useQuery<SerializedStockHolding[]>({
        queryKey: ['stockHoldings', selectedIngredientFilter, selectedLocationFilter],
        queryFn: () => fetchHoldings(selectedIngredientFilter, selectedLocationFilter),
    });

     // Mutation for deleting a holding
    const deleteHolding = useMutation({
        mutationFn: (id: string) => fetch(`/api/stock-holdings/${id}`, { method: 'DELETE' }).then(res => res.json()),
        onSuccess: (data: ApiResponse<{ id: string }>, variables) => {
            if (data.success) {
                notifications.show({ title: 'Sucesso', message: 'Lote de estoque removido.', color: 'green' });
                queryClient.invalidateQueries({ queryKey: ['stockHoldings'] });
                queryClient.invalidateQueries({ queryKey: ['aggregatedStock'] }); // Also invalidate aggregate
            } else {
                 notifications.show({ title: 'Erro', message: data.error || 'Falha ao remover lote.', color: 'red' });
            }
        },
        onError: (error: any) => {
             notifications.show({ title: 'Erro', message: error.message || 'Erro inesperado.', color: 'red' });
        }
    });

    const handleOpenAdjustModal = (holding: SerializedStockHolding) => {
        setHoldingToAdjust(holding);
        setModalOpened(true);
    };

    const handleCloseAdjustModal = () => {
        setHoldingToAdjust(null);
        setModalOpened(false);
        queryClient.invalidateQueries({ queryKey: ['stockHoldings'] });
        queryClient.invalidateQueries({ queryKey: ['aggregatedStock'] });
    }

    const handleDeleteClick = (holding: SerializedStockHolding) => {
        if (confirm(`Tem certeza que deseja excluir este lote de ${holding.ingredient.name} (${holding.quantity} ${holding.ingredient.unit})? Esta ação não pode ser desfeita.`)) {
            deleteHolding.mutate(holding.id);
        }
    }

    const ingredientOptions = [{ label: 'Todos Ingredientes', value: '' }, ...ingredientDefs.map(i => ({ label: i.name, value: i.id }))];
    const locationOptions = [{ label: 'Todos Locais', value: '' }, ...locations.map(l => ({ label: l.name, value: l.id }))];

    const rows = holdings?.map((holding) => {
        const quantityNum = parseFloat(holding.quantity);
        const isExpired = holding.expiryDate && new Date(holding.expiryDate) < new Date();
        const isExpiringSoon = holding.expiryDate && new Date(holding.expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Within 7 days

        return (
            <Table.Tr key={holding.id}>
                <Table.Td>{holding.ingredient.name}</Table.Td>
                <Table.Td>{holding.location.name}</Table.Td>
                <Table.Td>
                    <Text fw={700}>{quantityNum.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {holding.ingredient.unit}</Text>
                </Table.Td>
                <Table.Td>
                    {holding.purchaseDate ? format(new Date(holding.purchaseDate), 'dd/MM/yy', { locale: ptBR }) : 'N/A'}
                </Table.Td>
                <Table.Td>
                    {holding.expiryDate ? (
                        <Badge color={isExpired ? 'red' : isExpiringSoon ? 'orange' : 'gray'}>
                            {format(new Date(holding.expiryDate), 'dd/MM/yy', { locale: ptBR })}
                        </Badge>
                    ) : 'N/A'}
                </Table.Td>
                <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                        <Tooltip label="Ajustar Quantidade">
                            <ActionIcon variant='light' color='yellow' onClick={() => handleOpenAdjustModal(holding)}>
                                <IconAdjustments size={16} />
                            </ActionIcon>
                        </Tooltip>
                         <Tooltip label="Excluir Lote">
                            <ActionIcon variant='light' color='red' onClick={() => handleDeleteClick(holding)} loading={deleteHolding.isPending && deleteHolding.variables === holding.id}>
                                <IconTrash size={16} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Table.Td>
            </Table.Tr>
        );
    });

    return (
        <>
            {holdingToAdjust && (
                 <AdjustStockHoldingModal
                    opened={modalOpened}
                    onClose={handleCloseAdjustModal}
                    holding={holdingToAdjust}
                    onSuccess={handleCloseAdjustModal}
                 />
            )}
            <Stack>
                <Group grow>
                    <Select
                        label="Filtrar por Ingrediente"
                        placeholder="Todos"
                        data={ingredientOptions}
                        value={selectedIngredientFilter}
                        onChange={setSelectedIngredientFilter}
                        searchable
                        clearable
                        leftSection={<IconSearch size={16}/>}
                    />
                    <Select
                        label="Filtrar por Localização"
                        placeholder="Todos"
                        data={locationOptions}
                        value={selectedLocationFilter}
                        onChange={setSelectedLocationFilter}
                        searchable
                        clearable
                         leftSection={<IconFilter size={16}/>}
                    />
                     {/* Button to trigger AddStockHoldingModal */}
                     <Stack gap={0} justify="flex-end">
                        <Text size="xs" c="dimmed">Ou adicione um novo lote:</Text>
                         <Select
                           placeholder="Selecione ingrediente p/ adicionar"
                           data={ingredientDefs.map(i => ({ label: i.name, value: i.id }))}
                           onChange={(value) => {
                               const selectedDef = ingredientDefs.find(i => i.id === value);
                               if (selectedDef) onAddStockClick(selectedDef);
                           }}
                           searchable
                           clearable
                           leftSection={<IconPlus size={16}/>}
                         />
                     </Stack>
                </Group>

                <Table.ScrollContainer minWidth={800}>
                    <Table verticalSpacing="sm" striped highlightOnHover withTableBorder>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Ingrediente</Table.Th>
                                <Table.Th>Localização</Table.Th>
                                <Table.Th>Quantidade</Table.Th>
                                <Table.Th>Data Compra</Table.Th>
                                <Table.Th>Data Validade</Table.Th>
                                <Table.Th>Ações</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {isLoading ? (
                                <Table.Tr>
                                    <Table.Td colSpan={6}>
                                        <Center h={200}><Loader /></Center>
                                    </Table.Td>
                                </Table.Tr>
                            ) : isError ? (
                                <Table.Tr>
                                    <Table.Td colSpan={6}>
                                         <Text c="red" ta="center">Erro: {(error as Error)?.message}</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : rows && rows.length > 0 ? (
                                rows
                            ) : (
                                <Table.Tr>
                                    <Table.Td colSpan={6}>
                                        <Text ta="center" c="dimmed" py="lg">
                                            Nenhum lote de estoque encontrado com os filtros atuais.
                                        </Text>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Stack>
        </>
    );
}