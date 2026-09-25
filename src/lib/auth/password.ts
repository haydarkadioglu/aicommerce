import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export function isPasswordStrong(password: string): {
  ok: boolean;
  reason?: string;
} {
  if (password.length < 8)
    return { ok: false, reason: "Password must be at least 8 characters" };
  if (!/[A-Z]/.test(password))
    return { ok: false, reason: "Password must contain an uppercase letter" };
  if (!/[a-z]/.test(password))
    return { ok: false, reason: "Password must contain a lowercase letter" };
  if (!/[0-9]/.test(password))
    return { ok: false, reason: "Password must contain a number" };
  return { ok: true };
}
