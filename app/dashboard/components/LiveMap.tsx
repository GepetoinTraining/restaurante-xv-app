// File: app/dashboard/components/LiveMap.tsx
"use client";

import { SimpleGrid, Paper, Title, Stack, Text, Group, Badge } from "@mantine/core";
import { LiveClient } from "@/lib/types"; // Import the correct LiveClient type
import { LiveClientCard } from "./LiveClientCard";
// --- REMOVED: import { SeatingArea, Visit, Client } from "@prisma/client"; ---
// --- REMOVED: Unused local type definition ---
// type SeatingAreaWithVisit = SeatingArea & { ... };

type LiveMapProps = {
  activeVisits: LiveClient[];
  // --- REMOVED: Unused optional prop ---
  // seatingAreas?: SeatingAreaWithVisit[];
};


export function LiveMap({ activeVisits }: LiveMapProps) {

  // --- Keep this logic commented out or remove if not needed ---
  // const visitsByArea: { [key: number]: LiveClient[] } = {};
  const unassignedVisits: LiveClient[] = [];

  (activeVisits || []).forEach(visit => {
      // Use venueObjectId from LiveClient type
      if (visit?.venueObjectId) {
          // Logic for grouping by area would go here if needed
          // if (!visitsByArea[visit.venueObjectId]) { // Use string ID
          //     visitsByArea[visit.venueObjectId] = [];
          // }
          // visitsByArea[visit.venueObjectId].push(visit);
      } else {
          // Collect visits without an associated venue object
          if (visit) {
              unassignedVisits.push(visit);
          }
      }
  });
  // --- End commented/removed logic ---

  return (
    <Paper withBorder p="md" radius="md">
      <Title order={4}>Clientes Ativos ({activeVisits?.length ?? 0})</Title>
      <Text size="sm" c="dimmed" mb="md">
        Clientes que estão na casa com um check-in ativo.
      </Text>
      <Stack>
        {(activeVisits?.length ?? 0) > 0 ? (
          activeVisits.map((client) => (
            // LiveClientCard uses seatingAreaName from LiveClient type if available
            <LiveClientCard key={client.visitId} client={client} />
          ))
        ) : (
          <Text c="dimmed">Nenhum cliente na casa.</Text>
        )}
      </Stack>
       {/* Display clients who checked in but haven't scanned a location QR code */}
       {unassignedVisits.length > 0 && (
           <>
                <Title order={5} mt="md">Clientes Aguardando Localização ({unassignedVisits.length})</Title>
                <Stack mt="xs">
                    {unassignedVisits.map(client => (
                        <LiveClientCard key={client.visitId} client={client} />
                    ))}
                </Stack>
           </>
       )}
    </Paper>
  );
}