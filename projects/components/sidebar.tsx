"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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
              <Link
                key={project.slug}
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
            );
          })}
        </nav>
      </aside>
    </>
  );
}
