// PATH: app/dashboard/floorplan/components/FloorPlanManager.tsx
// NOTE: This is a NEW FILE. This is the main client component.

"use client";

import { useState, useEffect } from "react";
import {
  Grid,
  Loader,
  Select,
  Button,
  Group,
  LoadingOverlay,
  Text, // <--- Added Text import here
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import {
  FloorPlan,
  VenueObject,
  Workstation,
  VenueObjectType,
} from "@prisma/client";
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { CreateFloorPlanModal } from "./CreateFloorPlanModal";
import { VenueObjectEditor } from "./VenueObjectEditor"; // The main editor component

// Define the type for a floor plan that includes its objects
export type FloorPlanWithObjects = FloorPlan & {
  objects: (VenueObject & { workstation: Workstation | null })[];
};

export function FloorPlanManager() {
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<FloorPlanWithObjects | null>(
    null
  );
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch the list of all available floor plans
  const fetchFloorPlanList = async () => {
    setIsListLoading(true);
    try {
      const res = await fetch("/api/floorplans");
      const data: ApiResponse<FloorPlan[]> = await res.json();
      if (data.success && data.data) {
        setFloorPlans(data.data);
        // If no plan is selected, select the first one
        if (!selectedPlanId && data.data.length > 0) {
          setSelectedPlanId(data.data[0].id);
        }
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao carregar lista de plantas",
          color: "red",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsListLoading(false);
    }
  };

  // Fetch the full details of the currently selected floor plan
  const fetchActiveFloorPlan = async () => {
    if (!selectedPlanId) return;

    setIsPlanLoading(true);
    setActivePlan(null); // Clear previous plan
    try {
      const res = await fetch(`/api/floorplans/${selectedPlanId}`);
      const data: ApiResponse<FloorPlanWithObjects> = await res.json();
      if (data.success && data.data) {
        setActivePlan(data.data);
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao carregar planta",
          color: "red",
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsPlanLoading(false);
    }
  };

  // Initial fetch for the list
  useEffect(() => {
    fetchFloorPlanList();
  }, []);

  // Re-fetch full plan when selection changes
  useEffect(() => {
    fetchActiveFloorPlan();
  }, [selectedPlanId]);

  return (
    <>
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Select
            label="Selecione a Planta Baixa"
            placeholder="Carregando plantas..."
            disabled={isListLoading}
            data={floorPlans.map((fp) => ({
              value: fp.id,
              label: fp.name,
            }))}
            value={selectedPlanId}
            onChange={setSelectedPlanId}
          />
        </Grid.Col>
        <Grid.Col
          span={{ base: 12, md: 4 }}
          style={{ display: "flex", alignItems: "flex-end" }}
        >
          <Button
            leftSection={<IconPlus size={14} />}
            onClick={() => setIsModalOpen(true)}
            fullWidth
          >
            Nova Planta Baixa
          </Button>
        </Grid.Col>
      </Grid>

      <div style={{ position: "relative", minHeight: "400px" }}>
        <LoadingOverlay visible={isPlanLoading} />
        {activePlan ? (
          <VenueObjectEditor
            floorPlan={activePlan}
            onRefresh={fetchActiveFloorPlan} // Pass refresh function
          />
        ) : (
          !isPlanLoading && (
            <Text> {/* Now this <Text> refers to the Mantine component */}
              Nenhuma planta selecionada ou a planta não possui objetos.
            </Text>
          )
        )}
      </div>

      <CreateFloorPlanModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newPlan) => {
          setIsModalOpen(false);
          // Refetch the list and select the new plan
          fetchFloorPlanList().then(() => {
            setSelectedPlanId(newPlan.id);
          });
        }}
      />
    </>
  );
}