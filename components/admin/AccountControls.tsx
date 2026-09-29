"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resendInvite, setAccountRole } from "@/app/admin/account-actions";
import { ROLE_LABELS, type AccountRole } from "@/lib/auth/roles";

const ROLE_OPTIONS: { value: AccountRole; description: string; icon: string }[] = [
  { value: "customer", description: "Shops on the store. No dashboard access.", icon: "person" },
  { value: "admin", description: "Manages orders, products, deals and payments.", icon: "admin_panel_settings" },
  { value: "super_admin", description: "Everything admins can do, plus the Accounts page.", icon: "shield_person" },
];

const RANK: Record<AccountRole, number> = { customer: 0, admin: 1, super_admin: 2 };

function Notice({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white/70">
      <span className="material-symbols-outlined text-base text-purple-300">{icon}</span>
      <p>{children}</p>
    </div>
  );
}

/**
 * Role picker for one account. The server re-checks every rule shown here;
 * this only explains up front why an option is unavailable.
 */
export function AccountRoleManager({
  accountId,
  currentRole,
  isOwnerAccount,
  isSelf,
  viewerIsOwner,
}: {
  accountId: string;
  currentRole: AccountRole;
  isOwnerAccount: boolean;
  isSelf: boolean;
  viewerIsOwner: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<AccountRole>(currentRole);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (isOwnerAccount) {
    return (
      <Notice icon="lock">
        This is the <strong className="text-white">main super admin</strong> account. It can&apos;t be demoted or
        removed by anyone.
      </Notice>
    );
  }
  if (isSelf) {
    return <Notice icon="lock">You can&apos;t change your own role. Ask the main super admin if it needs to change.</Notice>;
  }
  if (currentRole === "super_admin" && !viewerIsOwner) {
    return <Notice icon="lock">Only the main super admin can change another super admin&apos;s role.</Notice>;
  }

  const demoting = RANK[selected] < RANK[currentRole];
  const unchanged = selected === currentRole;

  function save() {
    setError(null);
    setMessage(null);
    if (demoting && !armed) {
      setArmed(true);
      return;
    }
    startTransition(async () => {
      const result = await setAccountRole(accountId, selected);
      setArmed(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Role updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Account role" className="grid gap-2">
        {ROLE_OPTIONS.map((option) => {
          const locked = option.value === "super_admin" && !viewerIsOwner;
          const active = selected === option.value;
          return (
            <label
              key={option.value}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                locked
                  ? "cursor-not-allowed border-white/5 opacity-40"
                  : active
                    ? "cursor-pointer border-purple-500 bg-purple-500/10"
                    : "cursor-pointer border-white/10 hover:border-white/20"
              }`}
            >
              <input
                type="radio"
                name="account-role"
                value={option.value}
                checked={active}
                disabled={locked || pending}
                onChange={() => {
                  setSelected(option.value);
                  setArmed(false);
                  setError(null);
                  setMessage(null);
                }}
                className="mt-0.5 accent-purple-500"
              />
              <span className="material-symbols-outlined text-base text-purple-300">{option.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-xs font-black text-white">
                  {ROLE_LABELS[option.value]}
                  {option.value === currentRole && (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-white/60">
                      Current
                    </span>
                  )}
                  {locked && <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Main super admin only</span>}
                </span>
                <span className="block text-[11px] text-white/50">{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>

      {armed && (
        <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          {selected === "customer"
            ? "They'll lose dashboard access and be signed out on all devices. Click again to confirm."
            : "They'll lose access to the Accounts page. Click again to confirm."}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={unchanged || pending}
        className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black text-white transition disabled:opacity-40 ${
          armed ? "bg-red-500 hover:bg-red-400" : "bg-purple-600 hover:bg-purple-500"
        }`}
      >
        <span className="material-symbols-outlined text-base">{armed ? "warning" : "save"}</span>
        {pending ? "Saving…" : armed ? `Confirm: make ${ROLE_LABELS[selected]}` : `Save as ${ROLE_LABELS[selected]}`}
      </button>

      {error && (
        <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg border border-green-400/20 bg-green-400/10 px-3 py-2 text-xs font-bold text-green-300">
          {message}
        </p>
      )}
    </div>
  );
}

export function ResendInviteButton({ accountId }: { accountId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await resendInvite(accountId);
            setResult(r.ok ? { ok: true, text: r.message ?? "Invite sent." } : { ok: false, text: r.error });
          })
        }
        className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[11px] font-black text-amber-200 hover:bg-amber-400/20 disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-sm">forward_to_inbox</span>
        {pending ? "Sending…" : "Resend invite"}
      </button>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={`text-[11px] font-bold ${result.ok ? "text-green-300" : "text-red-300"}`}>
          {result.text}
        </p>
      )}
    </div>
  );
}
