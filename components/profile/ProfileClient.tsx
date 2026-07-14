"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/providers/CartProvider";
import { formatKes } from "@/lib/products";
import {
  DEFAULT_AVATAR,
  avatarLibrary,
  fileToAvatarDataUrl,
} from "@/lib/avatars";

const PROFILE_KEY = "kelmon-profile";

interface StoredOrder {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  dropPoint: string;
  payment: string;
  total: number;
  status: string;
  lines: { name: string; quantity: number; price: number }[];
}

interface ProfileData {
  name: string;
  email: string;
  location: string;
  phone: string;
  avatar: string;
}

const emptyProfile: ProfileData = {
  name: "",
  email: "",
  location: "Nairobi, Kenya",
  phone: "",
  avatar: DEFAULT_AVATAR,
};

/** 1 glam point per KES 100 spent */
function pointsFromTotal(totalKes: number) {
  return Math.floor(Math.max(0, totalKes) / 100);
}

function persistProfile(next: ProfileData) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export default function ProfileClient() {
  const { itemCount } = useCart();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileData>(emptyProfile);
  const [savedFlash, setSavedFlash] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let nextProfile = { ...emptyProfile };
    let nextOrders: StoredOrder[] = [];

    try {
      const rawProfile = localStorage.getItem(PROFILE_KEY);
      if (rawProfile) {
        nextProfile = { ...emptyProfile, ...(JSON.parse(rawProfile) as ProfileData) };
      }
    } catch {
      /* ignore */
    }

    try {
      const rawOrders = localStorage.getItem("kelmon-orders");
      if (rawOrders) {
        nextOrders = JSON.parse(rawOrders) as StoredOrder[];
        if (!Array.isArray(nextOrders)) nextOrders = [];
      }
    } catch {
      nextOrders = [];
    }

    const latest = nextOrders[0];
    if (latest) {
      if (!nextProfile.name.trim()) nextProfile.name = latest.name || "";
      if (!nextProfile.phone.trim()) nextProfile.phone = latest.phone || "";
      if (!nextProfile.location.trim() || nextProfile.location === "Nairobi, Kenya") {
        nextProfile.location = latest.dropPoint || nextProfile.location;
      }
    }

    if (!nextProfile.name.trim()) nextProfile.name = "Guest";
    if (!nextProfile.avatar) nextProfile.avatar = DEFAULT_AVATAR;

    setProfile(nextProfile);
    setDraft(nextProfile);
    setOrders(nextOrders);
  }, []);

  useEffect(() => {
    if (!avatarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAvatarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [avatarOpen]);

  const spent = useMemo(
    () => orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [orders]
  );
  const points = pointsFromTotal(spent);

  const stats = [
    { value: orders.length, label: "Orders", href: "#order-history" },
    { value: points, label: "Points", href: "#order-history" },
    { value: itemCount, label: "In cart", href: "/cart" },
  ];

  const applyAvatar = (src: string) => {
    const next = { ...profile, avatar: src };
    setProfile(next);
    setDraft((d) => ({ ...d, avatar: src }));
    persistProfile(next);
    setAvatarError(null);
    setAvatarOpen(false);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setAvatarError(null);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      applyAvatar(dataUrl);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startEdit = () => {
    setDraft(profile);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(profile);
    setEditing(false);
  };

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    const next: ProfileData = {
      name: draft.name.trim() || "Guest",
      email: draft.email.trim(),
      location: draft.location.trim() || "Nairobi, Kenya",
      phone: draft.phone.trim(),
      avatar: draft.avatar || profile.avatar || DEFAULT_AVATAR,
    };
    setProfile(next);
    setEditing(false);
    persistProfile(next);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    <main className="relative flex-grow overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[280px] md:h-[320px] bg-primary-container"
        aria-hidden="true"
      />

      <div className="relative z-10 px-margin-mobile md:px-margin-desktop pt-14 md:pt-16 pb-16 md:pb-24">
        <div className="max-w-3xl mx-auto mt-8 md:mt-10 space-y-8">
          <div className="relative bg-white dark:bg-surface rounded-[1.75rem] shadow-[0_20px_60px_rgba(142,68,173,0.18)] px-6 pt-16 pb-8 md:px-10 md:pt-[4.5rem] md:pb-10">
            {/* Avatar — tap to change */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-14 md:-top-16">
              <button
                type="button"
                onClick={() => {
                  setAvatarError(null);
                  setAvatarOpen(true);
                }}
                className="group relative w-[112px] h-[112px] md:w-[128px] md:h-[128px] rounded-full ring-[6px] ring-white dark:ring-surface shadow-[0_12px_32px_rgba(142,68,173,0.25)] overflow-hidden bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                aria-label="Change profile photo"
              >
                <Image
                  src={profile.avatar || DEFAULT_AVATAR}
                  alt="Your avatar"
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="128px"
                  priority
                />
                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center text-white">
                    <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                      photo_camera
                    </span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider mt-0.5">
                      Change
                    </span>
                  </span>
                </span>
                <span className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-surface">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                    add_a_photo
                  </span>
                </span>
              </button>
            </div>

            <div className="absolute top-5 left-5 right-5 flex justify-between items-center">
              <a
                href="#order-history"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary hover:text-[#7a3a96] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  receipt_long
                </span>
                History
              </a>
              <button
                type="button"
                onClick={editing ? cancelEdit : startEdit}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary hover:text-[#7a3a96] transition-colors"
              >
                {editing ? "Cancel" : "Edit"}
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  {editing ? "close" : "edit"}
                </span>
              </button>
            </div>

            {editing ? (
              <form onSubmit={saveProfile} className="mt-6 space-y-3 text-left max-w-md mx-auto">
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                    Name
                  </span>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1 w-full h-11 px-3.5 rounded-xl bg-[#faf6fc] dark:bg-surface-container border border-primary/15 text-sm outline-none focus:border-primary"
                    placeholder="Your name"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                    Email
                  </span>
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                    className="mt-1 w-full h-11 px-3.5 rounded-xl bg-[#faf6fc] dark:bg-surface-container border border-primary/15 text-sm outline-none focus:border-primary"
                    placeholder="you@email.com"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                    Location
                  </span>
                  <input
                    value={draft.location}
                    onChange={(e) => setDraft((p) => ({ ...p, location: e.target.value }))}
                    className="mt-1 w-full h-11 px-3.5 rounded-xl bg-[#faf6fc] dark:bg-surface-container border border-primary/15 text-sm outline-none focus:border-primary"
                    placeholder="Nairobi, Kenya"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                    Phone
                  </span>
                  <input
                    type="tel"
                    value={draft.phone}
                    onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))}
                    className="mt-1 w-full h-11 px-3.5 rounded-xl bg-[#faf6fc] dark:bg-surface-container border border-primary/15 text-sm outline-none focus:border-primary"
                    placeholder="07XX XXX XXX"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setAvatarOpen(true)}
                  className="w-full h-11 rounded-xl border border-primary/20 text-primary text-[11px] font-semibold uppercase tracking-[0.14em] hover:bg-primary/5 transition-colors"
                >
                  Change avatar
                </button>
                <button
                  type="submit"
                  className="w-full h-11 rounded-full text-white text-[11px] font-semibold uppercase tracking-[0.16em] profile-cta-btn"
                >
                  Save profile
                </button>
              </form>
            ) : (
              <div className="text-center mt-4">
                <h1 className="font-display-lg text-[1.65rem] md:text-[1.85rem] text-on-surface tracking-tight">
                  {profile.name}
                </h1>
                <p className="mt-1.5 text-sm text-on-surface-variant">{profile.location}</p>
                {profile.email ? (
                  <p className="mt-3 text-sm text-primary">{profile.email}</p>
                ) : (
                  <p className="mt-3 text-sm text-on-surface-variant/70">No email yet — tap Edit</p>
                )}
                {profile.phone && (
                  <p className="mt-1 text-sm text-on-surface-variant">{profile.phone}</p>
                )}
                {savedFlash && (
                  <p className="mt-2 text-xs text-secondary" role="status">
                    Profile saved
                  </p>
                )}
              </div>
            )}

            {!editing && (
              <div className="mt-8 pt-6 border-t border-primary/10 grid grid-cols-3 gap-2 text-center">
                {stats.map((stat) => (
                  <a
                    key={stat.label}
                    href={stat.href}
                    className="group py-1 hover:opacity-80 transition-opacity"
                  >
                    <p className="text-xl md:text-2xl font-semibold text-on-surface tabular-nums group-hover:text-primary transition-colors">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">
                      {stat.label}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-surface rounded-2xl px-5 py-4 md:px-6 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-[0_10px_32px_rgba(142,68,173,0.1)]">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                  stars
                </span>
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  Glam points
                </p>
                <p className="text-lg font-semibold text-on-surface tabular-nums">
                  {points} pts
                  <span className="ml-2 text-sm font-normal text-on-surface-variant">
                    · {formatKes(spent)} spent
                  </span>
                </p>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant sm:text-right max-w-xs">
              Earn 1 point per KES 100 on every order.
            </p>
          </div>

          <section id="order-history" className="scroll-mt-28">
            <div className="flex items-end justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display-lg text-xl md:text-2xl text-on-surface tracking-tight">
                  Order history
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {orders.length === 0
                    ? "No orders on this device yet."
                    : `${orders.length} order${orders.length === 1 ? "" : "s"} · points from each checkout`}
                </p>
              </div>
              <Link
                href="/shop"
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary hover:text-[#7a3a96]"
              >
                Shop
              </Link>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white dark:bg-surface rounded-2xl px-6 py-10 text-center shadow-[0_10px_32px_rgba(142,68,173,0.08)]">
                <p className="text-sm text-on-surface-variant mb-5">
                  Place an order and it&apos;ll show up here with the points you earned.
                </p>
                <Link
                  href="/shop"
                  className="inline-flex h-11 px-7 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-[0.14em] items-center"
                >
                  Start shopping
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {orders.map((order) => {
                  const pts = pointsFromTotal(order.total);
                  return (
                    <li
                      key={order.id}
                      className="bg-white dark:bg-surface rounded-2xl px-5 py-4 md:px-6 md:py-5 shadow-[0_8px_28px_rgba(142,68,173,0.08)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{order.id}</p>
                          <p className="mt-0.5 text-xs text-on-surface-variant">
                            {new Date(order.createdAt).toLocaleString("en-KE", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">
                            {formatKes(order.total)}
                          </p>
                          <p className="mt-0.5 text-xs text-secondary font-semibold">
                            +{pts} pts
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-on-surface-variant line-clamp-2">
                        {order.lines.map((l) => `${l.name} ×${l.quantity}`).join(" · ")}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                        <span className="uppercase tracking-wider font-semibold text-primary/80">
                          {order.status.replace(/_/g, " ")}
                        </span>
                        <span>{order.dropPoint}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <p className="text-center text-xs text-on-surface-variant/80 leading-relaxed">
            Profile, cart &amp; orders stay on this device until accounts go live.
          </p>
        </div>
      </div>

      {/* Avatar picker */}
      {avatarOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-picker-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={() => setAvatarOpen(false)}
          />
          <div className="relative w-full sm:max-w-md bg-white dark:bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 md:p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2
                id="avatar-picker-title"
                className="font-display-lg text-lg text-on-surface tracking-tight"
              >
                Choose avatar
              </h2>
              <button
                type="button"
                onClick={() => setAvatarOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-primary/10 hover:text-primary"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  close
                </span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onUpload(e.target.files?.[0])}
            />

            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-12 rounded-2xl border border-dashed border-primary/35 bg-primary/5 text-primary text-[11px] font-semibold uppercase tracking-[0.14em] flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                upload
              </span>
              {uploading ? "Uploading…" : "Upload your photo"}
            </button>

            {avatarError && (
              <p className="mt-2 text-xs text-red-600" role="alert">
                {avatarError}
              </p>
            )}

            <p className="mt-5 mb-3 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
              Avatar library
            </p>
            <div className="grid grid-cols-4 gap-3">
              {avatarLibrary.map((opt) => {
                const selected = profile.avatar === opt.src;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => applyAvatar(opt.src)}
                    title={opt.label}
                    className={`relative aspect-square rounded-full overflow-hidden ring-2 transition-all ${
                      selected
                        ? "ring-primary scale-105 shadow-[0_0_0_3px_rgba(142,68,173,0.25)]"
                        : "ring-transparent hover:ring-primary/40"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={opt.src}
                      alt={opt.label}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
