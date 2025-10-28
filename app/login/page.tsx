"use client";
// Note: This is the exact same code as your previous app/page.tsx, just moved here.

import {
  Container,
  Paper,
  Title,
  Text,
  PinInput,
  Stack,
  Button,
  LoadingOverlay,
  Center,
  Image,
} from "@mantine/core";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";
import { ApiResponse, StaffSession } from "@/lib/types"; // Adjust path if needed

export default function StaffLoginPage() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    // Basic frontend length check before sending
    if (pin.length !== 6) {
        notifications.show({
            title: "PIN Inválido",
            message: "O PIN deve conter exatamente 6 dígitos.",
            color: "yellow",
        });
        return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const result: ApiResponse<StaffSession> = await response.json();

      if (response.ok && result.success && result.data) { // Check result.data exists
        notifications.show({
          title: `Bem-vindo, ${result.data.name}!`, // Use result.data
          message: "Login realizado com sucesso.",
          color: "green",
        });
        // Redirect to appropriate Acaia dashboard page
        router.push("/dashboard/live"); // Redirecting to /dashboard/live now
      } else {
        // Use error from result if available, otherwise generic message
        throw new Error(result.error || result.message || "PIN inválido ou falha no login");
      }
    } catch (error: any) {
      notifications.show({
        title: "Erro no Login",
        message: error.message,
        color: "red",
      });
      setLoading(false); // Ensure loading stops on error
      setPin(""); // Clear PIN on error
    }
    // setLoading(false); // Not needed here, handled in try/catch
  };

  return (
    <Container size="xs" style={{ height: "100vh" }}>
      <Stack justify="center" style={{ height: "100%" }}>
        <Paper withBorder shadow="xl" p="xl" radius="md">
          <LoadingOverlay visible={loading} />
          <Stack align="center">
            <Image src="/logo.jpg" alt="Acaia Logo" w={150} />

            <Title order={2} mt="md">
              Acaia - Acesso Staff
            </Title>
            <Text c="dimmed" size="sm" ta="center">
              Por favor, insira seu PIN de staff para continuar.
            </Text>

            <PinInput
              size="xl"
              length={6}
              type="number"
              oneTimeCode
              autoFocus
              value={pin}
              onChange={setPin}
              onComplete={handleLogin}
            />

            <Button
              fullWidth
              mt="lg"
              color="pastelGreen"
              onClick={handleLogin}
              loading={loading}
              disabled={pin.length !== 6}
            >
              Entrar
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

