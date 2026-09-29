import "server-only";

import { createClient, createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  AdminNotificationRow,
  ContactMessageRow,
  EmailCampaignRow,
} from "@/lib/supabase/types";

/**
 * Reads behind the admin Settings, Notifications and Communications pages.
 * Everything here except getContactRecipients() runs as the caller, so RLS
 * (admin-only on all four tables) is the authorisation.
 */

export const MAX_CONTACT_RECIPIENTS = 4;
export const CONTACT_RECIPIENTS_KEY = "contact_recipients";

function envContactRecipients(): string[] {
  return (process.env.RESEND_CONTACT_TO_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
    .slice(0, MAX_CONTACT_RECIPIENTS);
}

function asEmailList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.includes("@"))
    : [];
}

/**
 * Who receives contact-form emails: the list saved in admin Settings, or the
 * RESEND_CONTACT_TO_EMAIL env var until one has been saved. Uses the service
 * role because the contact form is submitted by anonymous visitors.
 */
export async function getContactRecipients(): Promise<string[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return envContactRecipients();
  }
  const { data, error } = await createServiceClient()
    .from("site_settings")
    .select("value")
    .eq("key", CONTACT_RECIPIENTS_KEY)
    .maybeSingle();

  if (error) console.error("[admin-inbox] getContactRecipients:", error.message);
  const saved = asEmailList(data?.value);
  return saved.length ? saved : envContactRecipients();
}

/** Admin view of the saved list; empty when the env fallback is in use. */
export async function getSavedContactRecipients(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await (await createClient())
    .from("site_settings")
    .select("value")
    .eq("key", CONTACT_RECIPIENTS_KEY)
    .maybeSingle();
  return asEmailList(data?.value);
}

export function getEnvContactRecipients(): string[] {
  return envContactRecipients();
}

export async function getNotifications(limit = 200): Promise<AdminNotificationRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await (await createClient())
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[admin-inbox] getNotifications:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getContactMessages(limit = 200): Promise<ContactMessageRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await (await createClient())
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[admin-inbox] getContactMessages:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getEmailCampaigns(limit = 50): Promise<EmailCampaignRow[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await (await createClient())
    .from("email_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[admin-inbox] getEmailCampaigns:", error.message);
    return [];
  }
  return data ?? [];
}

/** Customer counts for the Communications audience picker. */
export async function getAudienceCounts(): Promise<{ all: number; withOrders: number }> {
  const [all, withOrders] = await Promise.all([
    resolveAudience("all_customers"),
    resolveAudience("customers_with_orders"),
  ]);
  return { all: all.length, withOrders: withOrders.length };
}

/** Distinct customer emails for an audience. Admin RLS lets this read every profile. */
export async function resolveAudience(
  audience: "all_customers" | "customers_with_orders"
): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();

  let userIds: Set<string> | null = null;
  if (audience === "customers_with_orders") {
    const { data } = await supabase.from("orders").select("user_id").not("user_id", "is", null);
    userIds = new Set((data ?? []).map((o) => o.user_id).filter((id): id is string => !!id));
    if (userIds.size === 0) return [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email")
    .not("email", "is", null);
  if (error) {
    console.error("[admin-inbox] resolveAudience:", error.message);
    return [];
  }

  const emails = new Set<string>();
  for (const row of data ?? []) {
    if (!row.email || (userIds && !userIds.has(row.id))) continue;
    emails.add(row.email.trim().toLowerCase());
  }
  return [...emails];
}
