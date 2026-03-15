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
];
