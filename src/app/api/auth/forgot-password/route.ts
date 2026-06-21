import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@core/database/client";
import { sendEmailOtp } from "@/modules/auth-membership/application/email-otp.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, code, newPassword } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (action === "request") {
      if (!user) {
        return NextResponse.json({ error: "No account found with this email." }, { status: 404 });
      }

      const otp = await sendEmailOtp(normalizedEmail, user.id);
      if (!otp.ok) {
        return NextResponse.json({ error: otp.error }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        devOtp: otp.devOtp,
        devOtpHint: otp.devOtpHint,
      });
    }

    if (action === "reset") {
      if (!user) {
        return NextResponse.json({ error: "No account found with this email." }, { status: 404 });
      }

      if (!code || !newPassword) {
        return NextResponse.json({ error: "Verification code and new password are required." }, { status: 400 });
      }

      if (newPassword.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
      }

      // Verify OTP
      const otp = await prisma.emailOtp.findFirst({
        where: { email: normalizedEmail, userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      if (!otp) {
        return NextResponse.json({ error: "No verification code found. Request a new one." }, { status: 400 });
      }

      if (otp.expiresAt < new Date()) {
        return NextResponse.json({ error: "Code expired. Request a new one." }, { status: 400 });
      }

      if (otp.attempts >= 5) {
        return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 400 });
      }

      // Check code
      const valid = await bcrypt.compare(code, otp.codeHash);
      await prisma.emailOtp.update({
        where: { id: otp.id },
        data: { attempts: otp.attempts + 1 },
      });

      if (!valid) {
        return NextResponse.json({ error: "Incorrect verification code." }, { status: 400 });
      }

      // Update user password
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("[forgot-password-api] error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
