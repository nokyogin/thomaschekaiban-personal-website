import { notFound } from "next/navigation";
import Link from "next/link";
import { projects } from "@/data/projects";
import { ThemeToggle } from "@/components/theme-toggle";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    notFound();
  }

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "3.5rem 1.5rem 2rem",
      }}
    >
      <Link
        href="/"
        style={{
          color: "var(--muted)",
          textDecoration: "none",
          fontSize: "0.875rem",
          display: "inline-block",
          marginBottom: "2rem",
          opacity: 0,
          animation: "rise 0.6s ease-out forwards",
        }}
      >
        &larr; Back to projects
      </Link>
      <h1
        style={{
          fontSize: "clamp(1.5rem, 5vw, 2rem)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          marginBottom: "0.5rem",
          opacity: 0,
          animation: "rise 0.6s ease-out 0.05s forwards",
        }}
      >
        {project.name}
      </h1>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.95rem",
          marginBottom: "2rem",
          opacity: 0,
          animation: "rise 0.6s ease-out 0.1s forwards",
        }}
      >
        {project.description}
      </p>
      <div
        style={{
          padding: "2rem",
          background: "var(--bio-bg)",
          border: "1px solid var(--bio-border)",
          borderRadius: 14,
          textAlign: "center",
          color: "var(--muted)",
          opacity: 0,
          animation: "rise 0.6s ease-out 0.15s forwards",
        }}
      >
        Project content will go here.
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
        <ThemeToggle />
      </div>
    </div>
  );
}
