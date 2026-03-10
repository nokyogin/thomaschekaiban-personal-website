import Link from "next/link";
import type { Project } from "@/data/projects";

const statusColors: Record<Project["status"], string> = {
  active: "#16a34a",
  idea: "#eab308",
  archived: "#6b7280",
};

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      style={{
        display: "block",
        padding: "1.25rem 1.5rem",
        background: "var(--bio-bg)",
        border: "1px solid var(--bio-border)",
        borderRadius: 14,
        boxShadow:
          "0 2px 8px var(--card-shadow-1), 0 8px 24px var(--card-shadow-2), 0 1px 0 var(--card-highlight) inset",
        textDecoration: "none",
        color: "inherit",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>
          {project.name}
        </h2>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: statusColors[project.status],
          }}
        >
          {project.status}
        </span>
      </div>
      <p style={{ fontSize: "0.9rem", color: "var(--bio-color)", lineHeight: 1.5 }}>
        {project.description}
      </p>
      <span
        style={{
          display: "inline-block",
          marginTop: "0.75rem",
          fontSize: "0.75rem",
          color: "var(--muted)",
          padding: "0.2rem 0.6rem",
          border: "1px solid var(--pill-border)",
          borderRadius: 100,
        }}
      >
        {project.category}
      </span>
    </Link>
  );
}
