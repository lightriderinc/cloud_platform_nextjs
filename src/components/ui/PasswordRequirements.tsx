import { MdCheck } from "react-icons/md";

/**
 * Minimum password length enforced by the app.
 * Mirrors the Logto password policy (Console > Security > Password policy) so
 * the client-side hint and the server-side rule stay in sync.
 */
export const MIN_PASSWORD_LENGTH = 8;

/** Any non-alphanumeric character counts as "special". */
const SPECIAL_CHARACTER = /[^A-Za-z0-9]/;

type Requirement = {
  label: string;
  /**
   * Optional live validator. When provided, the item turns green the moment the
   * current password satisfies it. Items without a validator are advisory: they
   * can't be verified in the browser (e.g. Logto's personal-info / breach checks
   * run on submit), so they're shown as guidance and never gate submission.
   */
  test?: (password: string) => boolean;
};

export const PASSWORD_REQUIREMENTS: Requirement[] = [
  {
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    test: (password) => password.length >= MIN_PASSWORD_LENGTH,
  },
  {
    label: "Contains at least 1 special character",
    test: (password) => SPECIAL_CHARACTER.test(password),
  },
  { label: "No personal info (name, email, or phone)" },
];

/** True when every live (client-checkable) requirement passes. Advisory rules are ignored. */
export function meetsLivePasswordRequirements(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every(({ test }) => (test ? test(password) : true));
}

type Props = {
  /** Current password value; live rules re-evaluate as it changes. */
  password?: string;
  /** Optional extra classes for the wrapping list (e.g. spacing). */
  className?: string;
};

/**
 * Reusable, live password-requirements checklist.
 *
 * Each rule with a validator turns green as soon as the typed password satisfies
 * it. Reuse anywhere a new password is set — profile password change, reset
 * flow, sign-up, etc. Pair with {@link meetsLivePasswordRequirements} to gate a
 * submit button on the same rules.
 */
export default function PasswordRequirements({ password = "", className = "" }: Props) {
  return (
    <ul className={`space-y-1 ${className}`} aria-label="Password requirements">
      {PASSWORD_REQUIREMENTS.map(({ label, test }) => {
        const isLive = typeof test === "function";
        const met = test ? test(password) : false;

        // Live rules show red until met, then green. Advisory rules stay neutral gray.
        const iconColor = met ? "text-green-600" : isLive ? "text-red-500" : "text-gray-200";
        const labelColor = met ? "text-gray-500" : isLive ? "text-red-500" : "text-gray-300";

        return (
          <li key={label} className="flex items-start gap-1.5 text-xs leading-relaxed">
            <span
              className={`mt-[3px] flex h-3 w-3 shrink-0 items-center justify-center transition-colors ${iconColor}`}
              aria-hidden="true"
            >
              {met ? (
                <MdCheck className="h-3 w-3" />
              ) : (
                <span className="h-1 w-1 rounded-full bg-current" />
              )}
            </span>
            <span className={`transition-colors ${labelColor}`}>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
