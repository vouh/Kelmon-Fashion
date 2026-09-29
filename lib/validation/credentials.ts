/** A plausible email address: something@domain.tld, no spaces. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Password rules for every form that sets one: sign-up, reset, and accepting
 * an invite. Passwords go straight from the browser to Firebase, so this is
 * checked client-side; mirror it in the Firebase console's password policy to
 * have Firebase enforce it too.
 */
export const PASSWORD_RULES: readonly { id: string; label: string; test: (password: string) => boolean }[] = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "number", label: "A number", test: (p) => /\d/.test(p) },
  { id: "upper", label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "special", label: "A special character (e.g. ! @ # $)", test: (p) => /[^A-Za-z0-9\s]/.test(p) },
];

/** The first unmet rule as a sentence, or null when the password is acceptable. */
export function passwordProblem(password: string): string | null {
  if (password.length > 128) return "Password must be 128 characters or fewer.";
  const missing = PASSWORD_RULES.filter((rule) => !rule.test(password));
  if (missing.length === 0) return null;
  return `Password needs: ${missing.map((rule) => rule.label.toLowerCase()).join(", ")}.`;
}
