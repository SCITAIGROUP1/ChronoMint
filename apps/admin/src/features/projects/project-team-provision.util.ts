export type ProjectProvisionLine = { email: string; name: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local.replace(/[._+-]+/g, " ").trim();
}

export function normalizeInviteEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidInviteEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

/** Build a provision row; empty name falls back to a readable email local-part. */
export function buildInvitePerson(emailRaw: string, nameRaw?: string): ProjectProvisionLine | null {
  const email = normalizeInviteEmail(emailRaw);
  if (!isValidInviteEmail(email)) return null;
  const name = (nameRaw ?? "").trim() || nameFromEmail(email);
  if (!name) return null;
  return { email, name };
}

/**
 * Parse paste/bulk text: one person per line as `email` or `email, name`.
 * Also accepts commas/semicolons as separators for email-only lists.
 */
export function parseProjectProvisionLines(raw: string): {
  members: ProjectProvisionLine[];
  errors: string[];
} {
  const members: ProjectProvisionLine[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  const lines = raw
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const comma = line.indexOf(",");
    let emailRaw: string;
    let nameRaw: string | undefined;
    if (comma === -1) {
      emailRaw = line;
    } else {
      emailRaw = line.slice(0, comma);
      nameRaw = line.slice(comma + 1);
    }
    const person = buildInvitePerson(emailRaw, nameRaw);
    if (!person) {
      errors.push(`Line ${i + 1}: enter a valid email${nameRaw !== undefined ? " and name" : ""}`);
      continue;
    }
    if (seen.has(person.email)) continue;
    seen.add(person.email);
    members.push(person);
  }

  return { members, errors };
}

/** Merge new invites into an existing list; later entries update the name for the same email. */
export function mergeInvitePeople(
  existing: ProjectProvisionLine[],
  incoming: ProjectProvisionLine[]
): ProjectProvisionLine[] {
  const byEmail = new Map(existing.map((m) => [m.email, m]));
  for (const person of incoming) {
    byEmail.set(person.email, person);
  }
  return Array.from(byEmail.values());
}
