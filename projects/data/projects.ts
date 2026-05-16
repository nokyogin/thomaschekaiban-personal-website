export interface Project {
  slug: string;
  name: string;
  description: string;
}

export const projects: Project[] = [
  {
    slug: "health",
    name: "Health",
    description: "Personal health tracking and wellness.",
  },
  {
    slug: "wealth",
    name: "Wealth",
    description: "Personal wealth tracking and net worth evolution.",
  },
  {
    slug: "tarnib",
    name: "TSK",
    description: "Tarnib Score Keeper.",
  },
  {
    slug: "roll",
    name: "RTR",
    description: "Roule Thomas Roule.",
  },
];
