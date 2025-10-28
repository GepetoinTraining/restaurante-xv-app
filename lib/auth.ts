// PATH: lib/auth.ts
// This file configures 'iron-session' for managing user login state.
// It creates an encrypted cookie to store session data.

import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";
import type { SessionOptions } from "iron-session";
import { Role } from "@prisma/client"; // Import the Role enum from Prisma

// Define the shape of the data to be stored in the session
export interface UserSession {
  id: string;
  name: string;
  role: Role;
  isLoggedIn: true;
}

// Define the shape of the actual data stored IN the session object
interface SessionDataBase {
  user?: UserSession; // Changed from 'staff' to 'user'
}

// Define the SessionData type by providing SessionDataBase as the type argument to IronSession
// This adds the .save(), .destroy(), .updateConfig() methods to our SessionDataBase structure
export type SessionData = IronSession<SessionDataBase>;

// Configure the session
export const sessionOptions: SessionOptions = {
  password: process.env.AUTH_SECRET as string, // Must set in .env.local
  cookieName: "acaiaclub_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production", // Use environment variable for secure flag
    httpOnly: true,
  },
};

// Helper function to get the current session from a server component or route
export async function getSession(): Promise<SessionData> {
  const session = await getIronSession<SessionDataBase>( // Pass the BASE data type here
    cookies(),
    sessionOptions
  );
  // The returned session object will automatically have the IronSession methods mixed in
  return session;
}