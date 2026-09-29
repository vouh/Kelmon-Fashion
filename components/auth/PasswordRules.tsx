import { PASSWORD_RULES } from "@/lib/validation/credentials";

/** Live checklist of the password rules, ticking each off as it is met. */
export default function PasswordRules({ password, className = "" }: { password: string; className?: string }) {
  return (
    <ul className={`grid gap-1 text-xs sm:grid-cols-2 ${className}`} aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 ${met ? "text-green-600 dark:text-green-400" : "text-on-surface-variant"}`}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              {met ? "check_circle" : "radio_button_unchecked"}
            </span>
            <span>
              {rule.label}
              <span className="sr-only">{met ? " (met)" : " (not met)"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
