"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

type Props = {
  /** Already sanitised on the server (see safeRedirectPath). */
  callbackURL: string;
  /** True when the OAuth flow came back with ?error=... */
  initialError?: boolean;
  labels: { idle: string; pending: string; error: string };
};

export function GoogleLoginButton({
  callbackURL,
  initialError = false,
  labels,
}: Props) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(initialError);

  async function handleClick() {
    // Guards double clicks: each click would create a separate OAuth state.
    if (pending) return;
    setPending(true);
    setFailed(false);

    // If the user cancels on Google's side, come back to this page
    // (keeping ?next=...) instead of landing on a raw API error page.
    const back = new URL(window.location.href);
    back.searchParams.delete("error");

    try {
      const { error } = await signIn.social({
        provider: "google",
        callbackURL,
        errorCallbackURL: back.pathname + back.search,
      });
      if (error) throw error;
      // Success: the client is already navigating to Google.
      // Keep the pending state until the page unloads.
    } catch {
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-12 w-full gap-3 text-base"
        onClick={handleClick}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : (
          <GoogleIcon />
        )}
        {pending ? labels.pending : labels.idle}
      </Button>

      {failed && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {labels.error}
        </p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden focusable="false">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.85z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}
