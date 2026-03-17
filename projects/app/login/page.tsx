"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: 380,
          width: "100%",
          opacity: 0,
          animation: "rise 0.6s ease-out forwards",
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            textAlign: "center",
            marginBottom: "0.5rem",
          }}
        >
          Projects
        </h1>
        <p
          style={{
            color: "var(--muted)",
            textAlign: "center",
            fontSize: "0.95rem",
            marginBottom: "2rem",
          }}
        >
          Sign in with Google to continue.
        </p>
        {error && (
          <p
            style={{
              color: "var(--error-fg)",
              background: "var(--error-bg)",
              border: "1px solid var(--error-border)",
              borderRadius: 8,
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              marginBottom: "0.75rem",
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.75rem",
            fontSize: "1rem",
            fontWeight: 500,
            fontFamily: "inherit",
            color: "var(--pill-hover-fg)",
            background: "var(--pill-hover-bg)",
            border: "none",
            borderRadius: 10,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "opacity 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.07l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}
