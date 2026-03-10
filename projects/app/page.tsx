import { projects } from "@/data/projects";
import { ProjectCard } from "@/components/project-card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardPage() {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "3.5rem 1.5rem 2rem",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(1.5rem, 5vw, 2rem)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          textAlign: "center",
          marginBottom: "0.5rem",
          opacity: 0,
          animation: "rise 0.6s ease-out forwards",
        }}
      >
        Projects
      </h1>
      <p
        style={{
          color: "var(--muted)",
          textAlign: "center",
          fontSize: "0.95rem",
          marginBottom: "2.5rem",
          opacity: 0,
          animation: "rise 0.6s ease-out 0.1s forwards",
        }}
      >
        Personal project hub
      </p>
      <div
        style={{
          display: "grid",
          gap: "1rem",
          opacity: 0,
          animation: "rise 0.6s ease-out 0.2s forwards",
        }}
      >
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
        <ThemeToggle />
      </div>
    </div>
  );
}
