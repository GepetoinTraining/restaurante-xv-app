// PATH: app/about/page.tsx
import { Title, Text, Stack, Paper, ThemeIcon, List, Group } from "@mantine/core";
import { IconCookie, IconUsers, IconListDetails, IconToolsKitchen, IconScale } from "@tabler/icons-react";

// Helper component for styling sections
function InfoSection({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) {
    return (
        <Paper withBorder p="xl" radius="md" shadow="sm">
            <Group>
                <ThemeIcon size={60} radius="md" variant="light">
                    {icon}
                </ThemeIcon>
                <Stack gap="xs">
                    <Title order={2}>{title}</Title>
                    <Text size="lg" c="dimmed">{children}</Text>
                </Stack>
            </Group>
        </Paper>
    )
}

// Main page component
export default function AboutPage() {
  return (
    <Stack gap="xl">
        <Title order={1} ta="center" fz={48} mt="lg">
            Um Super Ajudante para o Restaurante!
        </Title>
        <Text size="xl" ta="center" c="dimmed" maw={700} mx="auto">
            Este aplicativo é como um cérebro extra para a equipe do restaurante. 
            Ele ajuda a cuidar de tudo, desde a comida até os clientes, para que 
            tudo funcione direitinho.
        </Text>

        <InfoSection icon={<IconUsers size={32} />} title="Conhece os Clientes">
            O app sabe quem está em cada mesa. Quando um cliente chega, 
            o app ajuda a criar uma comanda para ele, como uma conta mágica.
        </InfoSection>

        <InfoSection icon={<IconListDetails size={32} />} title="Anota os Pedidos">
            Os garçons usam o app para anotar o que você quer comer ou beber. 
            O pedido vai direto para a cozinha ou para o bar, sem demora!
        </InfoSection>

        <InfoSection icon={<IconCookie size={32} />} title="Conta toda a Comida">
            O app é como um detetive da geladeira. Ele sabe quanta
            comida tem no estoque. Assim, o chef sabe exatamente o que 
            precisa comprar e nada estraga.
        </InfoSection>

        <InfoSection icon={<IconToolsKitchen size={32} />} title="Ajuda a Cozinha">
            Ele também avisa os cozinheiros quando é hora de preparar mais 
            comida, como "Ei, precisamos fazer mais arroz!" ou "Hora de 
            cortar mais tomates!".
        </InfoSection>

        <InfoSection icon={<IconScale size={32} />} title="Cuida do Buffet">
            Quando você pega comida no buffet, o app usa uma balança
            para pesar o seu prato. Assim, você paga certinho só pelo 
            que pegou. Ele também avisa a equipe quando a comida do 
            buffet está acabando.
        </InfoSection>

        <Paper withBorder p="xl" radius="md" bg="blue.0">
            <Title order={3} ta="center">
                Tudo Conectado!
            </Title>
            <Text size="lg" ta="center" mt="md">
                A melhor parte é que tudo isso fala um com o outro! O pedido usa a 
                comida do estoque, o estoque avisa a cozinha, e a cozinha enche o 
                buffet. É um grande trabalho em equipe!
            </Text>
        </Paper>
    </Stack>
  );
}