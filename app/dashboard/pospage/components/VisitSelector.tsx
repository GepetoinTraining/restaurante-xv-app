// PATH: app/dashboard/pospage/components/VisitSelector.tsx
// NOTE: This is a NEW FILE.

"use client";

import { useState, useMemo } from "react";
import {
  Combobox,
  TextInput,
  useCombobox,
  Text,
  Group,
  Loader,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query"; // Using react-query for fetching
import { ApiResponse } from "@/lib/types";
import { ActiveVisitResponse } from "@/app/api/visits/active/route"; // Import response type
import { IconSearch } from "@tabler/icons-react";

interface VisitSelectorProps {
  onVisitSelect: (visit: ActiveVisitResponse) => void;
  selectedVisit: ActiveVisitResponse | null;
}

// Helper to fetch active visits
const fetchActiveVisits = async (
  query: string
): Promise<ActiveVisitResponse[]> => {
  const response = await fetch(`/api/visits/active?query=${query}`);
  const data: ApiResponse<ActiveVisitResponse[]> = await response.json();
  if (data.success && data.data) {
    return data.data;
  }
  throw new Error(data.error || "Failed to fetch visits");
};

export function VisitSelector({
  onVisitSelect,
  selectedVisit,
}: VisitSelectorProps) {
  // ---- START FIX ----
  // Remove onOptionSubmit from here
  const combobox = useCombobox({
    // onOptionSubmit: (val) => { ... }, // REMOVED
  });

  // Create the handler function separately
  const handleOptionSubmit = (val: string) => {
    const selected = visits?.find((v) => v.id === val);
    if (selected) {
      onVisitSelect(selected);
      setSearch(selected.client.name); // Show name in input after selection
    }
    combobox.closeDropdown();
  };
  // ---- END FIX ----

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const {
    data: visits,
    isLoading,
    isError,
  } = useQuery<ActiveVisitResponse[], Error>({
    queryKey: ["activeVisits", debouncedSearch],
    queryFn: () => fetchActiveVisits(debouncedSearch),
    enabled: !selectedVisit, // Don't fetch if a visit is already selected
  });

  const options = useMemo(() => {
    if (!visits) return [];
    return visits.map((item) => (
      <Combobox.Option value={item.id} key={item.id}>
        <Group justify="space-between">
          <Text>
            {item.client.name} ({item.client.phone})
          </Text>
          <Text size="sm" c="dimmed">
            Tab: {item.tab.rfid}
          </Text>
        </Group>
      </Combobox.Option>
    ));
  }, [visits]);

  if (selectedVisit) {
    return (
      <Group>
        <Text fw={500}>Cliente Selecionado:</Text>
        <Text>
          {selectedVisit.client.name} (Tab: {selectedVisit.tab.rfid})
        </Text>
      </Group>
    );
  }

  return (
    <Combobox
      store={combobox}
      // ---- START FIX ----
      // Pass the handler function here
      onOptionSubmit={handleOptionSubmit}
      // ---- END FIX ----
      withinPortal={false}
    >
      <Combobox.Target>
        <TextInput
          label="Buscar Visita Ativa"
          placeholder="Buscar por Nome, Telefone ou RFID..."
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex(); // Add this line if needed for keyboard nav
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
            combobox.closeDropdown();
            // Optional: Reset search if nothing selected?
            // setSearch(selectedVisit ? selectedVisit.client.name : '');
          }}
          rightSection={isLoading ? <Loader size="xs" /> : <IconSearch />}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {isLoading && <Combobox.Empty>Carregando...</Combobox.Empty>}
          {isError && (
            <Combobox.Empty>
              <Text c="red">Falha ao buscar visitas</Text>
            </Combobox.Empty>
          )}
          {!isLoading && !isError && options.length === 0 && (
            <Combobox.Empty>Nenhuma visita ativa encontrada.</Combobox.Empty>
          )}
          {options}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}