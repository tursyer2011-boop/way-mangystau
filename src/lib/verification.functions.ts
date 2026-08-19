import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const emailSchema = z.string().email().max(200);
const codeSchema = z.string().regex(/^\d{6}$/);

/** Stores a freshly generated verification code (valid 15 minutes). */
export const storeVerificationCode = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ email: emailSchema, code: codeSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    await supabaseAdmin.from("verification_codes").delete().eq("email", email);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const { error } = await supabaseAdmin.from("verification_codes").insert({
      email,
      code: data.code,
      expires_at: expiresAt.toISOString(),
    });
    if (error) throw new Error(error.message);

    return { expiresAt: expiresAt.toISOString() };
  });

/** Verifies the code and, on success, creates the account + profile. */
export const verifyCodeAndRegister = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        email: emailSchema,
        code: codeSchema,
        password: z.string().min(6).max(72),
        username: z.string().max(80).optional(),
        nickname: z.string().max(80).optional(),
        phone: z.string().max(40).optional(),
        role: z.enum(["sender", "carrier", "both"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    const { data: row } = await supabaseAdmin
      .from("verification_codes")
      .select("id, code, expires_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row || row.code !== data.code) {
      return { ok: false as const, reason: "invalid" as const };
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await supabaseAdmin.from("verification_codes").delete().eq("id", row.id);
      return { ok: false as const, reason: "expired" as const };
    }

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        username: data.username ?? "",
        nickname: data.nickname ?? "",
        phone: data.phone ?? "",
        role: data.role,
      },
    });

    await supabaseAdmin.from("verification_codes").delete().eq("email", email);

    if (error) return { ok: false as const, reason: "signup" as const, message: error.message };
    return { ok: true as const };
  });
