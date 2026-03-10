export interface Project {
  slug: string;
  name: string;
  description: string;
  category: string;
  status: "active" | "idea" | "archived";
}

export const projects: Project[] = [
  {
    slug: "sports-tracker",
    name: "Sports Tracker",
    description: "Personal fitness and sports activity tracker.",
    category: "Sports",
    status: "idea",
  },
  {
    slug: "recipe-book",
    name: "Recipe Book",
    description: "Collection of personal recipes and meal plans.",
    category: "Personal",
    status: "idea",
  },
  {
    slug: "side-project-alpha",
    name: "Side Project Alpha",
    description: "Placeholder for a future project idea.",
    category: "Tools",
    status: "idea",
  },
];
