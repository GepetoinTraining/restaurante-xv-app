// PATH: app/api/staff/route.ts
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { Role, User, VenueObject, Workstation } from "@prisma/client"; // Import User and Role

/**
 * GET /api/staff
 * Fetches all users (staff) including their workstation assignments
 */
export async function GET(req: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      include: {
        assignedWorkstations: {
          // Include the StaffAssignment join table
          include: {
            venueObject: {
              // From the join table, get the VenueObject
              include: {
                workstation: true, // From the VenueObject, get the related Workstation
              },
            },
          },
        },
      },
    });

    // We need to shape the data to be more useful for the client
    const formattedUsers = users.map((user) => {
      // Find the first assignment that points to a venue object
      // that is linked to a workstation.
      const workstationAssignment = user.assignedWorkstations.find(
        (assignment) => assignment.venueObject?.workstation
      );

      return {
        ...user,
        // Simplify the structure for the client
        workstation: workstationAssignment
          ? workstationAssignment.venueObject.workstation
          : null,
      };
    });

    return NextResponse.json<ApiResponse<any[]>>(
      { success: true, data: formattedUsers },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/staff
 * Creates a new user (staff)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // workstationId from the form is the Workstation.id
    const { name, email, pin, role, workstationId } = body;

    if (!name || !email || !pin || !role) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Nome, email, PIN e função são obrigatórios" },
        { status: 400 }
      );
    }

    // Validate Role
    if (!Object.values(Role).includes(role as Role)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Função inválida" },
        { status: 400 }
      );
    }

    // Hash the PIN
    const hashedPin = await hash(pin, 10);

    // Find the *VenueObject* that represents the selected *Workstation*
    let workstationVenueObject: VenueObject | null = null;
    if (workstationId) {
      workstationVenueObject = await prisma.venueObject.findFirst({
        where: {
          workstationId: workstationId,
          type: "WORKSTATION", // Ensure it's the correct type
        },
      });
      
      if (!workstationVenueObject) {
         return NextResponse.json<ApiResponse>(
          { success: false, error: "Estação de trabalho (VenueObject) não encontrada." },
          { status: 404 }
        );
      }
    }

    // Create the user and optionally assign them to a workstation
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        pin: hashedPin,
        role: role as Role,
        // Create the StaffAssignment record if a workstation was found
        assignedWorkstations: workstationVenueObject
          ? {
              create: {
                venueObjectId: workstationVenueObject.id,
              },
            }
          : undefined,
      },
      include: {
        assignedWorkstations: true, // Return the new assignment
      },
    });

    return NextResponse.json<ApiResponse<User>>(
      { success: true, data: newUser },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating user:", error);
    if (error.code === "P2002" && error.meta?.target.includes("email")) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Este email já está em uso" },
        { status: 409 } // 409 Conflict
      );
    }
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}