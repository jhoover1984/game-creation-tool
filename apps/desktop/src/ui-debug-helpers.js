export function traceFilterKey(kind) {
  if (kind.startsWith("breakpoint:")) {
    return kind.slice("breakpoint:".length);
  }
  return kind;
}

export function traceMatches(event, filter) {
  if (filter === "all") {
    return true;
  }
  const key = traceFilterKey(event.kind);
  if (filter === "breakpoint") {
    return event.kind.startsWith("breakpoint:");
  }
  return key === filter;
}

export function buildWatchSections(data, activeWatchFilter = "all") {
  const flags = data.flags || [];
  const vars = data.vars || [];
  const inventory = data.inventory || [];
  const selectedFlags = data.selectedFlags || [];
  const selectedVars = data.selectedVars || [];
  const selectedInventory = data.selectedInventory || [];

  const sections = [];
  if (activeWatchFilter === "all" || activeWatchFilter === "flags") {
    sections.push({ title: "Global Flags", rows: flags });
    sections.push({ title: "Selected Flags", rows: selectedFlags });
  }
  if (activeWatchFilter === "all" || activeWatchFilter === "vars") {
    sections.push({ title: "Global Vars", rows: vars });
    sections.push({ title: "Selected Vars", rows: selectedVars });
  }
  if (activeWatchFilter === "all" || activeWatchFilter === "inventory") {
    sections.push({ title: "Global Inventory", rows: inventory });
    sections.push({ title: "Selected Inventory", rows: selectedInventory });
  }
  return sections;
}
