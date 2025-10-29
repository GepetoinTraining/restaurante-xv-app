// PATH: app/dashboard/components/MainNav.tsx
"use client";

import { NavLink, Stack, Button, Text, Skeleton, ScrollArea, MantineTheme } from "@mantine/core";
import {
    LayoutDashboard, Users, Martini, Archive, Calculator,
    UserPlus, LineChart, LogOut, Armchair, Package,
    CookingPot, ClipboardCheck, ClipboardList,
    Receipt, Scale, Trash2,
    // --- ICONS FOR GROUPS ---
    Home,
    Settings,
    // --- NEW ICONS ---
    Truck, Map, Undo2, Building, ClipboardPaste, DollarSign,
    Flame, CalendarDays, Briefcase, Building2, Filter
    // --- END NEW ICONS ---
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { ApiResponse, StaffSession } from "@/lib/types";

// --- START REFACTOR: Nested Nav Structure ---

// Define types for clarity
type SubNavLink = {
    icon: typeof LayoutDashboard; // Use one of the icons as a type
    label: string;
    href: string;
};

type NavGroup = {
    icon: typeof LayoutDashboard;
    label: string;
    links: SubNavLink[];
};

// Create the new nested navigation structure
const navLinks: NavGroup[] = [
    {
        icon: Home,
        label: "Principal",
        links: [
            { icon: LayoutDashboard, label: "Visão Geral", href: "/dashboard/live" },
            { icon: Calculator, label: "Nova Comanda (PDV)", href: "/dashboard/pospage" },
            { icon: Users, label: "Clientes", href: "/dashboard/clients" },
            { icon: Armchair, label: "Planta & Mesas", href: "/dashboard/floorplan" },
        ]
    },
    {
        icon: Package,
        label: "Inventário & Produção",
        links: [
            { icon: Martini, label: "Produtos & Receitas", href: "/dashboard/products" },
            { icon: Package, label: "Ingredientes", href: "/dashboard/ingredients" },
            { icon: CookingPot, label: "Receitas de Preparo", href: "/dashboard/prep-recipes" },
            { icon: Archive, label: "Estoque Detalhado", href: "/dashboard/stock" },
            { icon: Receipt, label: "Entrada (Invoices)", href: "/dashboard/invoices" },
            { icon: Trash2, label: "Registro de Perdas", href: "/dashboard/waste" },
        ]
    },
    {
        icon: ClipboardList,
        label: "Fluxo de Preparo",
        links: [
            { icon: ClipboardCheck, label: "Minhas Tarefas", href: "/dashboard/my-tasks" },
            { icon: ClipboardList, label: "Gerenciar Preparos", href: "/dashboard/prep-management" },
            { icon: Scale, label: "Buffet & Pesagem", href: "/dashboard/weigh-station" },
            // --- NEW ---
            { icon: Flame, label: "Status do Buffet", href: "/dashboard/buffet-status" },
            { icon: CalendarDays, label: "Menu do Dia", href: "/dashboard/daily-menu-assignments" },
            // --- END NEW ---
        ]
    },
    // --- NEW GROUP ---
    {
        icon: Truck,
        label: "Logística B2B",
        links: [
            { icon: Truck, label: "Entregas", href: "/dashboard/deliveries" },
            { icon: Map, label: "Roteirização", href: "/dashboard/routing" },
            { icon: Undo2, label: "Retorno de GNs", href: "/dashboard/pan-return" },
        ]
    },
    // --- NEW GROUP ---
    {
        icon: Briefcase,
        label: "Comercial B2B",
        links: [
            { icon: Building2, label: "Clientes Corporativos", href: "/dashboard/company-clients" },
            { icon: Filter, label: "Pipeline de Vendas", href: "/dashboard/sales-pipeline" },
        ]
    },
    // --- END NEW GROUP ---
    {
        icon: Settings,
        label: "Admin & Relatórios",
        links: [
            { icon: UserPlus, label: "Equipe", href: "/dashboard/staff" },
            { icon: LineChart, label: "Relatórios", href: "/dashboard/reports" },
            // --- NEW ---
            { icon: Building, label: "Fornecedores", href: "/dashboard/suppliers" },
            { icon: ClipboardPaste, label: "Ordens de Compra", href: "/dashboard/purchase-orders" },
            { icon: DollarSign, label: "Financeiro", href: "/dashboard/financials" },
            // --- END NEW ---
        ]
    },
];

// --- END REFACTOR ---


async function getClientSession(): Promise<StaffSession | null> {
    try {
        const res = await fetch('/api/session');
        if (!res.ok) return null;
        const data: ApiResponse<StaffSession> = await res.json();
        return data.success && data.data ? data.data : null;
    } catch (error) {
        console.error("Failed to fetch client session:", error);
        return null;
    }
}

// --- START REFACTOR: Extracted Styles Function ---
const getNavLinkStyles = (theme: MantineTheme) => {
    const activeColors = theme.variantColorResolver({
        color: theme.primaryColor,
        variant: 'light',
        theme,
    });

    return {
        root: {
            borderRadius: theme.radius.sm,

            '&[data-active]': {
                backgroundColor: activeColors.background,
                color: activeColors.color,
                fontWeight: 500,
                '& svg': {
                    color: activeColors.color,
                },
            },

            '&:hover:not([data-active])': {
                backgroundColor: 'var(--mantine-color-default-hover)',
            },
        },
    };
};
// --- END REFACTOR ---


export function MainNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [userName, setUserName] = useState<string | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);

    useEffect(() => {
        getClientSession().then(session => {
            if (session) {
                setUserName(session.name);
            }
            setLoadingSession(false);
        });
    }, []);


    const handleLogout = async () => {
        await fetch("/api/auth", { method: "DELETE" });
        router.push("/");
        router.refresh();
    };

    // Helper function to check if a link is active, accounting for sub-routes
    const isLinkActive = (href: string) => {
        return pathname === href || (href !== '/' && pathname.startsWith(href + '/'));
    };

    const navLinkStyles = getNavLinkStyles; // Use the extracted function

    return (
        <Stack justify="space-between" style={{ height: "100%" }}>
            <ScrollArea type="auto" style={{ flexGrow: 1, paddingRight: 'var(--mantine-spacing-md)' }}>
                <Stack>
                    {/* --- START REFACTOR: Render Nested NavLinks --- */}
                    {navLinks.map((group) => {
                        // Check if any sub-link in the group is active
                        const isGroupActive = group.links.some(link => isLinkActive(link.href));

                        return (
                            <NavLink
                                key={group.label}
                                label={group.label}
                                leftSection={<group.icon size="1rem" />}
                                active={isGroupActive}
                                defaultOpened={isGroupActive} // Auto-open the active group
                                variant="subtle"
                                styles={navLinkStyles}
                            >
                                {group.links.map((link) => (
                                    <NavLink
                                        key={link.label}
                                        href={link.href}
                                        label={link.label}
                                        leftSection={<link.icon size="1rem" />}
                                        active={isLinkActive(link.href)}
                                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                                            e.preventDefault();
                                            router.push(link.href);
                                        }}
                                        variant="subtle"
                                        styles={navLinkStyles}
                                        pl="xl" // Indent sub-links
                                    />
                                ))}
                            </NavLink>
                        );
                    })}
                    {/* --- END REFACTOR --- */}
                </Stack>
            </ScrollArea>

            <Stack gap="xs" pt="md" style={{ borderTop: `1px solid var(--mantine-color-default-border)` }}>
                {loadingSession ? (
                    <Skeleton height={15} width="70%" radius="sm" />
                ) : (
                    <Text size="sm" c="dimmed" truncate>
                        Logado como: {userName || 'Usuário'}
                    </Text>
                )}
                <Button
                    onClick={handleLogout}
                    variant="light"
                    color="red"
                    leftSection={<LogOut size="1rem" />}
                    fullWidth
                >
                    Sair
                </Button>
            </Stack>
        </Stack>
    );
}