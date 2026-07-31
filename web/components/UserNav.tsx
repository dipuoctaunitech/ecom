"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { User } from "lucide-react";

function safeInternalPath(value: string | null): string | null {
  if (!value) return null;
  try {
    if (value.startsWith("/") && !value.startsWith("//")) {
      return value;
    }
    const url = new URL(value);
    if (url.origin === window.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return null;
  }
  return null;
}

export default function UserNav({ overlay = false }: { overlay?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError(
        result.error === "CredentialsSignin"
          ? "Invalid email or password."
          : result.error
      );
      return;
    }

    if (result?.url?.includes("error=")) {
      const errorParam = new URL(result.url).searchParams.get("error");
      setError(errorParam ?? "Sign in failed. Please try again.");
      return;
    }

    if (!result?.ok) {
      setError("Sign in failed. Please try again.");
      return;
    }

    setOpen(false);

    const callbackPath = safeInternalPath(searchParams.get("callbackUrl"));
    if (callbackPath) {
      router.push(callbackPath);
      router.refresh();
      return;
    }

    router.refresh();
  }

  if (status === "loading") {
    return (
      <span className={`text-sm ${overlay ? "text-white" : "text-ink-muted"}`}>
        ...
      </span>
    );
  }

  if (!session) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={
            overlay
              ? "flex h-11 items-center gap-2 rounded-full border-2 border-white/70 bg-white/15 px-4 text-sm font-semibold text-white shadow-md backdrop-blur-md transition-colors hover:bg-white/25 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]"
              : "flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-ink-muted transition-colors hover:border-highlight/60 hover:text-ink"
          }
        >
          <User className="h-4 w-4" strokeWidth={overlay ? 2.25 : 1.75} />
          Sign In
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <form
              onSubmit={handleSignIn}
              className="absolute right-0 top-full z-40 mt-2 w-72 space-y-3 rounded-xl border border-line bg-surface-elevated p-4 shadow-2xl"
            >
              <p className="font-display text-sm font-medium text-ink">
                Sign in to FORMA
              </p>
              <input
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                autoComplete="username"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-highlight/60"
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-highlight/60"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-10 w-full items-center justify-center rounded-lg bg-highlight text-sm font-medium text-surface transition-colors hover:bg-highlight-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
              {error ? (
                <p className="text-xs text-red-400">{error}</p>
              ) : null}
            </form>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
        <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={
          overlay
            ? "flex h-11 items-center gap-2 rounded-full border-2 border-white/70 bg-white/15 px-3 text-sm font-semibold text-white shadow-md backdrop-blur-md transition-colors hover:bg-white/25 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]"
            : "flex h-11 items-center gap-2 rounded-full border border-line px-3 text-sm font-medium text-ink transition-colors hover:border-highlight/60"
        }
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-highlight/20 text-xs font-semibold text-highlight">
          {(session.user?.name || session.user?.email || "?")
            .charAt(0)
            .toUpperCase()}
        </span>
        <span className="hidden max-w-[8rem] truncate sm:inline">
          {session.user?.name || session.user?.email}
        </span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full z-40 mt-2 w-56 space-y-1 rounded-xl border border-line bg-surface-elevated p-2 shadow-2xl">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-ink">
                {session.user?.name || session.user?.email}
              </p>
              <span className="mt-1 inline-block rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                {session.user?.role}
              </span>
            </div>

            <Link
              href="/orders"
              className="block rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface"
              onClick={() => setOpen(false)}
            >
              My Orders
            </Link>

            {session.user?.role === "SELLER" && (
              <>
                <Link
                  href="/seller"
                  className="block rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface"
                  onClick={() => setOpen(false)}
                >
                  Seller Dashboard
                </Link>
                <Link
                  href="/seller?tab=products"
                  className="block rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface"
                  onClick={() => setOpen(false)}
                >
                  Track My Products
                </Link>
              </>
            )}

            {session.user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="block rounded-lg px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                Admin Dashboard
              </Link>
            )}

            <button
              type="button"
              onClick={() => signOut()}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-surface"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
