export const DASHBOARD_TEMPLATE_DEFAULT = "rpg";

export const DASHBOARD_TEMPLATE_CATALOG = Object.freeze([
  {
    id: "rpg",
    title: "RPG Room",
    selectLabel: "RPG Starter",
    eta: "8 min",
    difficulty: "Beginner",
    summary: "Player + NPC + dialog starter",
  },
  {
    id: "platformer",
    title: "Platformer Room",
    selectLabel: "Platformer Starter",
    eta: "6 min",
    difficulty: "Beginner",
    summary: "Spawn + goal + lane tiles",
  },
  {
    id: "puzzle",
    title: "Puzzle Room",
    selectLabel: "Puzzle Starter",
    eta: "7 min",
    difficulty: "Intermediate",
    summary: "Simple logic + interactables",
  },
  {
    id: "blank",
    title: "Blank",
    selectLabel: "Blank",
    eta: "3 min",
    difficulty: "Any",
    summary: "Start from clean map",
  },
]);

