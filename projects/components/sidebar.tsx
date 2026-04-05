"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { projects } from "@/data/projects";

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    if (isMobile) setOpen(false);
  }, [pathname, isMobile]);

  return (
    <>
      {/* Mobile hamburger */}
      {isMobile && (
        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle sidebar"
          style={{
            position: "fixed",
            top: 16,
            left: 16,
            zIndex: 100,
            background: "var(--sidebar-bg)",
            border: "1px solid var(--sidebar-border)",
            borderRadius: 8,
            color: "var(--fg)",
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {open ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      )}

      {/* Overlay (mobile) */}
      {isMobile && open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 49,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: 0,
          height: isMobile ? "100dvh" : "100dvh",
          width: 240,
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem 0",
          zIndex: 50,
          transform: isMobile && !open ? "translateX(-100%)" : "translateX(0)",
          transition: "transform 0.2s ease",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: "0 1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
            }}
          >
            Projects
          </h2>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {projects.map((project) => {
            const isActive = pathname === `/${project.slug}`;
            return (
              <div key={project.slug}>
                <Link
                  href={`/${project.slug}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.6rem 1.25rem",
                    fontSize: "0.9rem",
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? "var(--fg)" : "var(--bio-color)",
                    background: isActive ? "var(--sidebar-active)" : "transparent",
                    textDecoration: "none",
                    transition: "background 0.15s ease, color 0.15s ease",
                    borderLeft: isActive
                      ? "2px solid var(--fg)"
                      : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "var(--sidebar-hover)";
                      e.currentTarget.style.color = "var(--fg)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--bio-color)";
                    }
                  }}
                >
                  {project.name}
                </Link>
                {isActive && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "0.35rem 1.25rem 0.35rem 1.75rem",
                    }}
                  >
                    {project.slug === "health" && (
                      <>
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent("sidebar:upload"))}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.3rem 0",
                            fontSize: "0.78rem",
                            fontWeight: 400,
                            fontFamily: "inherit",
                            color: "var(--muted)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            transition: "color 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          Upload
                        </button>
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent("sidebar:reset"))}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.3rem 0",
                            fontSize: "0.78rem",
                            fontWeight: 400,
                            fontFamily: "inherit",
                            color: "#ef4444",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            transition: "opacity 0.15s ease",
                            opacity: 0.7,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1 4 1 10 7 10" />
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                          </svg>
                          Reset data
                        </button>
                      </>
                    )}
                    {project.slug === "wealth" && (
                      <>
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent("sidebar:toggle-amounts"))}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.3rem 0",
                            fontSize: "0.78rem",
                            fontWeight: 400,
                            fontFamily: "inherit",
                            color: "var(--muted)",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            transition: "color 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          Show / Hide
                        </button>
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent("sidebar:reset"))}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.3rem 0",
                            fontSize: "0.78rem",
                            fontWeight: 400,
                            fontFamily: "inherit",
                            color: "#ef4444",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            transition: "opacity 0.15s ease",
                            opacity: 0.7,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1 4 1 10 7 10" />
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                          </svg>
                          Reset data
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", padding: "0 1.25rem" }}>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              width: "100%",
              padding: "0.6rem 0",
              fontSize: "0.85rem",
              fontWeight: 400,
              fontFamily: "inherit",
              color: "var(--muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
