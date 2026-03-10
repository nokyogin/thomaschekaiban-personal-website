"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else if (res.status === 429) {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Wrong password.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
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
          Enter the password to continue.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            required
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              fontSize: "1rem",
              fontFamily: "inherit",
              color: "var(--fg)",
              background: "var(--bg)",
              border: "1px solid var(--input-border)",
              borderRadius: 10,
              outline: "none",
              transition: "border-color 0.2s",
              marginBottom: "0.75rem",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--input-focus)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--input-border)")
            }
          />
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
              }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
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
            }}
          >
            {loading ? "Checking..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
