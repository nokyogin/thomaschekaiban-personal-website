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
    slug: "siwa",
    name: "Siwa",
    description: "Word and puzzle games platform.",
  },
];
