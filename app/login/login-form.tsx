"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction, signingIn] = useActionState<AuthState, FormData>(
    signIn,
    initialError ? { error: initialError } : null,
  );
  const [signUpState, signUpAction, signingUp] = useActionState<AuthState, FormData>(signUp, null);
  const state = mode === "signin" ? signInState : signUpState;

  return (
    <div className="card w-full p-6">
      <div className="mb-5 grid grid-cols-2 rounded border border-line p-0.5 text-[13px]">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`h-8 rounded-sm ${mode === m ? "bg-brand text-white" : "text-muted hover:text-ink"}`}
          >
            {m === "signin" ? "Log In" : "Sign Up"}
          </button>
        ))}
      </div>

      <form action={mode === "signin" ? signInAction : signUpAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="full_name">Full name</label>
            <input id="full_name" name="full_name" className="input h-10" required autoComplete="name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input h-10" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            className="input h-10"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </div>

        {state?.error && <p className="rounded bg-[#fef1ee] px-3 py-2 text-danger">{state.error}</p>}
        {state?.message && <p className="rounded bg-[#ebf7e6] px-3 py-2 text-success">{state.message}</p>}

        <button type="submit" className="btn-brand h-10 w-full text-sm" disabled={signingIn || signingUp}>
          {mode === "signin" ? (signingIn ? "Logging in…" : "Log In") : signingUp ? "Creating account…" : "Create Account"}
        </button>
        {mode === "signup" && (
          <p className="text-xs text-muted">The first person to sign up becomes the System Administrator.</p>
        )}
      </form>
    </div>
  );
}
