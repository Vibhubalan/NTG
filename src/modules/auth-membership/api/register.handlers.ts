import { NextResponse, after } from "next/server";

import {

  signupStep1Schema,

  otpVerifySchema,

  riotLinkSchema,

  steamLinkSchema,

  selectGamesSchema,

  valorantRolesSchema,

  cs2PremierRankSchema,

  cs2FaceitRankSchema,

  profileAccountPatchSchema,

} from "../domain/schemas";

import {

  registerStep1,

  resendOtpForSignup,

  verifyOtpStep2,

  linkRiotDuringSignup,

  completeSignupFlow,

  getLoginBlockReason,

  getSignupStatus,

  abandonIncompleteSignup,

  abandonIncompleteSignupWithCredentials,

} from "../application/register.service";

import { getSignupPendingId } from "../infrastructure/signup-session";

import { linkRiotAccount } from "../application/riot-link.service";

import { linkSteamAccount } from "../application/steam-link.service";

import {

  selectPlayedGames,

  updateValorantRoles,

  updateCs2PeakPremierRank,

  updateCs2FaceitRank,

  updateAccountInfo,

  addPlayedGame,

  getPlayerGameProfile,

} from "../application/game-profile.service";

import { syncUserRank } from "@tournaments-leagues/index";

import { getSession } from "@core/auth/session";

import type { PlayedGame } from "@prisma/client";



function deferRankSync(userId: string): void {

  after(() => {

    syncUserRank(userId).catch(() => {});

  });

}



export async function handleRegister(req: Request) {

  return handleRegisterStep1(req);

}



export async function handleRegisterStep1(req: Request) {

  try {

    const body = await req.json();

    const parsed = signupStep1Schema.safeParse(body);

    if (!parsed.success) {

      return NextResponse.json(

        { error: parsed.error.issues[0]?.message ?? "Invalid input." },

        { status: 400 },

      );

    }



    const result = await registerStep1(parsed.data);

    if (!result.ok) {

      return NextResponse.json({ error: result.error }, { status: 400 });

    }



    return NextResponse.json(

      {

        ok: true,

        ...(result.resumeStep ? { resumeStep: result.resumeStep } : {}),

        ...(result.devOtp ? { devOtp: result.devOtp } : {}),
        ...(result.devOtpHint ? { devOtpHint: result.devOtpHint } : {}),

      },

      { status: 201 },

    );

  } catch (err) {

    console.error("[register step-1]", err);

    return NextResponse.json({ error: "Registration failed." }, { status: 500 });

  }

}



export async function handleSendOtp() {

  try {

    const userId = await getSignupPendingId();

    if (!userId) {

      return NextResponse.json({ error: "Signup session expired." }, { status: 401 });

    }



    const result = await resendOtpForSignup(userId);

    if (!result.ok) {

      return NextResponse.json({ error: result.error }, { status: 400 });

    }



    return NextResponse.json({

      ok: true,

      ...(result.devOtp ? { devOtp: result.devOtp } : {}),
      ...(result.devOtpHint ? { devOtpHint: result.devOtpHint } : {}),

    });

  } catch {

    return NextResponse.json({ error: "Failed to send code." }, { status: 500 });

  }

}



export async function handleSignupStatus() {

  try {

    const userId = await getSignupPendingId();

    if (!userId) {

      return NextResponse.json({ step: null });

    }



    const status = await getSignupStatus(userId);

    return NextResponse.json(status);

  } catch {

    return NextResponse.json({ step: null });

  }

}



export async function handleAbandonSignup(req?: Request) {

  try {

    if (req) {
      let body: { email?: string; password?: string } = {};
      try {
        body = await req.json();
      } catch {
        body = {};
      }

      if (body.email && body.password) {
        const result = await abandonIncompleteSignupWithCredentials(
          body.email,
          body.password,
        );
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
      }
    }

    const userId = await getSignupPendingId();

    if (!userId) {

      return NextResponse.json({ ok: true });

    }



    const result = await abandonIncompleteSignup(userId);

    if (!result.ok) {

      return NextResponse.json({ error: result.error }, { status: 400 });

    }



    return NextResponse.json({ ok: true });

  } catch {

    return NextResponse.json({ error: "Could not restart signup." }, { status: 500 });

  }

}



export async function handleVerifyOtp(req: Request) {

  try {

    const pendingId = await getSignupPendingId();

    if (!pendingId) {

      return NextResponse.json({ error: "Signup session expired." }, { status: 401 });

    }



    const body = await req.json();

    const parsed = otpVerifySchema.safeParse(body);

    if (!parsed.success) {

      return NextResponse.json(

        { error: parsed.error.issues[0]?.message ?? "Invalid code." },

        { status: 400 },

      );

    }



    const result = await verifyOtpStep2(pendingId, parsed.data.code);

    if (!result.ok) {

      return NextResponse.json({ error: result.error }, { status: 400 });

    }



    return NextResponse.json({ ok: true });

  } catch {

    return NextResponse.json({ error: "Verification failed." }, { status: 500 });

  }

}



export async function handleSelectGames(req: Request) {

  try {

    const userId = await getSignupPendingId();

    if (!userId) {

      return NextResponse.json({ error: "Signup session expired." }, { status: 401 });

    }



    const body = await req.json();

    const parsed = selectGamesSchema.safeParse(body);

    if (!parsed.success) {

      return NextResponse.json(

        { error: parsed.error.issues[0]?.message ?? "Invalid selection." },

        { status: 400 },

      );

    }



    const result = await selectPlayedGames(userId, parsed.data);

    if (!result.ok) {

      return NextResponse.json({ error: result.error }, { status: 400 });

    }



    return NextResponse.json({ ok: true });

  } catch {

    return NextResponse.json({ error: "Failed to save games." }, { status: 500 });

  }

}



export async function handleLinkRiotSignup(req: Request) {

  try {

    const userId = await getSignupPendingId();

    if (!userId) {

      return NextResponse.json({ error: "Signup session expired." }, { status: 401 });

    }



    const body = await req.json();

    const parsed = riotLinkSchema.safeParse(body);

    if (!parsed.success) {

      return NextResponse.json(

        { error: parsed.error.issues[0]?.message ?? "Invalid Riot ID." },

        { status: 400 },

      );

    }



    const result = await linkRiotDuringSignup(userId, parsed.data.riotId);

    if (!result.ok) {

      return NextResponse.json({ error: result.error }, { status: 400 });

    }



    deferRankSync(userId);



    return NextResponse.json({ ok: true });

  } catch {

    return NextResponse.json({ error: "Failed to link Riot ID." }, { status: 500 });

  }

}



export async function handleLinkSteamSignup(req: Request) {

  try {

    const userId = await getSignupPendingId();

    if (!userId) {

      return NextResponse.json({ error: "Signup session expired." }, { status: 401 });

    }



    const body = await req.json();

    const parsed = steamLinkSchema.safeParse(body);

    if (!parsed.success) {

      return NextResponse.json(

        { error: parsed.error.issues[0]?.message ?? "Invalid Steam URL." },

        { status: 400 },

      );

    }



    const result = await linkSteamAccount(userId, parsed.data.profileUrl);

    if (!result.ok) {

      return NextResponse.json({ error: result.error }, { status: 400 });

    }



    return NextResponse.json({
      steamId64: result.steamId64,
      personaName: result.personaName,
      cs2Hours: result.cs2Hours,
    });

  } catch {

    return NextResponse.json({ error: "Failed to link Steam." }, { status: 500 });

  }

}



export async function handleCompleteSignup() {

  try {

    const userId = await getSignupPendingId();

    if (!userId) {

      return NextResponse.json({ error: "Signup session expired." }, { status: 401 });

    }



    const result = await completeSignupFlow(userId);

    if (!result.ok) {

      return NextResponse.json({ error: result.error }, { status: 400 });

    }



    return NextResponse.json({ ok: true });

  } catch {

    return NextResponse.json({ error: "Could not complete signup." }, { status: 500 });

  }

}



export async function handleLinkRiotProfile(req: Request) {

  const session = await getSession();

  if (!session?.user?.id) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  try {

    const body = await req.json();

    const parsed = riotLinkSchema.safeParse(body);

    if (!parsed.success) {

      return NextResponse.json(

        { error: parsed.error.issues[0]?.message ?? "Invalid Riot ID." },

        { status: 400 },

      );

    }



    const result = await linkRiotAccount(session.user.id, parsed.data.riotId);

    if (!result.ok) {

      return NextResponse.json({ error: result.error }, { status: 400 });

    }



    await addPlayedGame(session.user.id, "VALORANT");

    deferRankSync(session.user.id);



    return NextResponse.json({ ok: true });

  } catch {

    return NextResponse.json({ error: "Failed to link Riot ID." }, { status: 500 });

  }

}



export async function handleLinkSteamProfile(req: Request) {

  const session = await getSession();

  if (!session?.user?.id) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  try {

    const body = await req.json();

    const parsed = steamLinkSchema.safeParse(body);

    if (!parsed.success) {

      return NextResponse.json(

        { error: parsed.error.issues[0]?.message ?? "Invalid Steam URL." },

        { status: 400 },

      );

    }



    const result = await linkSteamAccount(session.user.id, parsed.data.profileUrl);

    if (!result.ok) {

      return NextResponse.json({ error: result.error }, { status: 400 });

    }



    await addPlayedGame(session.user.id, "CS2");



    return NextResponse.json({
      steamId64: result.steamId64,
      personaName: result.personaName,
      cs2Hours: result.cs2Hours,
    });

  } catch {

    return NextResponse.json({ error: "Failed to link Steam." }, { status: 500 });

  }

}



export async function handleGameProfileGet() {

  const session = await getSession();

  if (!session?.user?.id) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  const profile = await getPlayerGameProfile(session.user.id);

  if (!profile) {

    return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  }



  return NextResponse.json({ profile });

}



export async function handleGameProfilePatch(req: Request) {

  const session = await getSession();

  if (!session?.user?.id) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  try {

    const body = (await req.json()) as Record<string, unknown>;



    if (body.action === "addGame") {

      const game = body.game as PlayedGame;

      if (game !== "VALORANT" && game !== "CS2") {

        return NextResponse.json({ error: "Invalid game." }, { status: 400 });

      }

      const result = await addPlayedGame(session.user.id, game);

      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

      return NextResponse.json({ ok: true });

    }



    if (body.valorantRoles !== undefined) {

      const parsed = valorantRolesSchema.safeParse(body.valorantRoles);

      if (!parsed.success) {

        return NextResponse.json({ error: "Invalid Valorant roles." }, { status: 400 });

      }

      const result = await updateValorantRoles(session.user.id, parsed.data);

      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

      return NextResponse.json({ ok: true });

    }



    if (body.cs2PeakPremierRank !== undefined) {

      const parsed = cs2PremierRankSchema.safeParse(body.cs2PeakPremierRank);

      if (!parsed.success) {

        return NextResponse.json({ error: "Invalid CS2 premier rank." }, { status: 400 });

      }

      const result = await updateCs2PeakPremierRank(session.user.id, parsed.data);

      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    }



    if (body.cs2FaceitRank !== undefined) {

      const parsed = cs2FaceitRankSchema.safeParse(body.cs2FaceitRank);

      if (!parsed.success) {

        return NextResponse.json({ error: "Invalid Faceit rank." }, { status: 400 });

      }

      const result = await updateCs2FaceitRank(session.user.id, parsed.data);

      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    }



    if (body.dateOfBirth !== undefined || body.olympusId !== undefined) {

      const parsed = profileAccountPatchSchema.safeParse({

        dateOfBirth: body.dateOfBirth,

        olympusId: body.olympusId,

      });

      if (!parsed.success) {

        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid account info." }, { status: 400 });

      }

      const result = await updateAccountInfo(session.user.id, parsed.data);

      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    }



    if (

      body.valorantRoles !== undefined ||

      body.cs2PeakPremierRank !== undefined ||

      body.cs2FaceitRank !== undefined ||

      body.dateOfBirth !== undefined ||

      body.olympusId !== undefined

    ) {

      return NextResponse.json({ ok: true });

    }



    return NextResponse.json({ error: "No valid update." }, { status: 400 });

  } catch {

    return NextResponse.json({ error: "Update failed." }, { status: 500 });

  }

}



export async function handleLoginCheck(req: Request) {

  try {

    const { email, password } = (await req.json()) as {

      email?: string;

      password?: string;

    };

    if (!email || !password) {

      return NextResponse.json({ error: "Email and password required." }, { status: 400 });

    }

    const block = await getLoginBlockReason(email, password);

    return NextResponse.json({

      blocked: !!block.reason,

      reason: block.reason,

      resumeStep: block.resumeStep,

      ...(block.devOtp ? { devOtp: block.devOtp } : {}),
      ...(block.devOtpHint ? { devOtpHint: block.devOtpHint } : {}),

    });

  } catch {

    return NextResponse.json({ error: "Check failed." }, { status: 500 });

  }

}


