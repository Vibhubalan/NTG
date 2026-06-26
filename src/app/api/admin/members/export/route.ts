import { guardResponse, isAuthedAdmin, requireAdmin } from "@/lib/auth-guard";
import { serverEnv } from "@core/config/env.server";
import { prisma } from "@core/database/client";
import { NextResponse } from "next/server";
import { computeAgeFromDateOfBirth } from "@/lib/date-age";

export const dynamic = "force-dynamic";

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(_req: Request) {
  if (!serverEnv.databaseUrl) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const auth = await requireAdmin();
  if (!isAuthedAdmin(auth)) return guardResponse(auth)!;

  // Fetch all users with profile and tournament registrations
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      playerProfile: true,
      registrations: {
        include: {
          tournament: true,
        },
      },
    },
  });

  const headers = [
    "ID",
    "Name",
    "Display Username",
    "Email",
    "Phone",
    "Date of Birth",
    "Age",
    "Olympus ID",
    "Role",
    "Riot ID",
    "Steam ID64",
    "Steam Persona Name",
    "CS2 Hours Played",
    "Signup Completed",
    "Email Verified",
    "Tournaments Played",
    "Date Created",
  ];

  const csvRows = [headers.join(",")];

  for (const u of users) {
    const riotId = u.riotGameName && u.riotTagLine ? `${u.riotGameName}#${u.riotTagLine}` : "";
    const dateOfBirth = u.dateOfBirth ? u.dateOfBirth.toISOString().slice(0, 10) : "";
    const age = computeAgeFromDateOfBirth(u.dateOfBirth);
    const dateCreated = u.createdAt.toISOString();
    
    // Collect unique tournament names they registered for
    const tournamentNames = Array.from(
      new Set(
        u.registrations
          .map((reg) => reg.tournament?.name)
          .filter(Boolean)
      )
    ).join("; ");

    const row = [
      escapeCSV(u.id),
      escapeCSV(u.name),
      escapeCSV(u.playerProfile?.displayName),
      escapeCSV(u.email),
      escapeCSV(u.phone),
      escapeCSV(dateOfBirth),
      escapeCSV(age),
      escapeCSV(u.olympusId),
      escapeCSV(u.role),
      escapeCSV(riotId),
      escapeCSV(u.steamId64),
      escapeCSV(u.steamPersonaName),
      escapeCSV(u.cs2HoursPlayed),
      escapeCSV(u.signupCompleted),
      escapeCSV(u.emailVerified ? "true" : "false"),
      escapeCSV(tournamentNames),
      escapeCSV(dateCreated),
    ];

    csvRows.push(row.join(","));
  }

  const csvContent = csvRows.join("\n");
  const filename = `all-members-export.csv`;

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
