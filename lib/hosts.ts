// Who may create events. HOST_EMAILS is a comma-separated allowlist; when it
// is unset every signed-in user can host (upstream OpenLuma behaviour).
const hostEmails = (process.env.HOST_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function canHostEvents(
  user: { email?: string | null; emailVerified?: boolean | null } | null
) {
  if (hostEmails.length === 0) {
    return true;
  }
  return Boolean(
    user?.email &&
      user.emailVerified &&
      hostEmails.includes(user.email.toLowerCase())
  );
}
