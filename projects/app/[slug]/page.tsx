import { notFound } from "next/navigation";
import { projects } from "@/data/projects";
import { DashboardLayout } from "@/components/dashboard-layout";
import { HealthDashboard } from "@/components/health-dashboard";
import { WealthDashboard } from "@/components/wealth-dashboard";
import { TarnibDashboard } from "@/components/tarnib-dashboard";

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

  if (slug === "health") {
    return (
      <DashboardLayout>
        <HealthDashboard />
      </DashboardLayout>
    );
  }

  if (slug === "wealth") {
    return (
      <DashboardLayout>
        <WealthDashboard />
      </DashboardLayout>
    );
  }

  if (slug === "tarnib") {
    return (
      <DashboardLayout>
        <TarnibDashboard />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ padding: "2rem 2.5rem", maxWidth: 800 }}>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            marginBottom: "0.5rem",
            opacity: 0,
            animation: "rise 0.6s ease-out forwards",
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
            animation: "rise 0.6s ease-out 0.05s forwards",
          }}
        >
          {project.description}
        </p>
        <div
          style={{
            padding: "3rem 2rem",
            background: "var(--bio-bg)",
            border: "1px solid var(--bio-border)",
            borderRadius: 14,
            textAlign: "center",
            color: "var(--muted)",
            opacity: 0,
            animation: "rise 0.6s ease-out 0.1s forwards",
          }}
        >
          Project content will go here.
        </div>
      </div>
    </DashboardLayout>
  );
}
