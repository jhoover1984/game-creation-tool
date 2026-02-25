import { normalizeAnimationTransitionRule } from "./animation-transition-schema.js";

/** @type {Array<string>} */
export const ANIMATION_CONDITION_KINDS = [
  "flag_set",
  "flag_set_for_ticks",
  "int_gte",
  "int_lte",
  "int_gt",
  "int_lt",
  "int_eq",
  "int_between",
  "clip_finished",
  "never",
];

/**
 * @param {string} kind
 * @returns {object}
 */
export function createDefaultCondition(kind) {
  switch (kind) {
    case "flag_set":
      return { kind, flag: "is_moving" };
    case "flag_set_for_ticks":
      return { kind, flag: "is_moving", min_ticks: 4 };
    case "int_gte":
    case "int_lte":
    case "int_gt":
    case "int_lt":
    case "int_eq":
      return { kind, key: "speed_tier", value: 0 };
    case "int_between":
      return { kind, key: "speed_tier", min: 0, max: 1 };
    case "clip_finished":
    case "never":
      return { kind };
    default:
      throw new Error(`unsupported animation transition condition kind '${kind}'`);
  }
}

/**
 * Returns UI field metadata for condition editors.
 * @param {string} kind
 * @returns {Array<{ name: string, label: string, input: "text"|"number", required: boolean, min?: number }>}
 */
export function conditionEditorFields(kind) {
  switch (kind) {
    case "flag_set":
      return [{ name: "flag", label: "Flag", input: "text", required: true }];
    case "flag_set_for_ticks":
      return [
        { name: "flag", label: "Flag", input: "text", required: true },
        { name: "min_ticks", label: "Min Ticks", input: "number", required: true, min: 0 },
      ];
    case "int_gte":
    case "int_lte":
    case "int_gt":
    case "int_lt":
    case "int_eq":
      return [
        { name: "key", label: "Int Param", input: "text", required: true },
        { name: "value", label: "Value", input: "number", required: true },
      ];
    case "int_between":
      return [
        { name: "key", label: "Int Param", input: "text", required: true },
        { name: "min", label: "Min", input: "number", required: true },
        { name: "max", label: "Max", input: "number", required: true },
      ];
    case "clip_finished":
    case "never":
      return [];
    default:
      throw new Error(`unsupported animation transition condition kind '${kind}'`);
  }
}

/**
 * @param {{ from_state?: string, to_state?: string, kind?: string }} [seed]
 * @returns {{ from_state: string, to_state: string, condition: object }}
 */
export function buildTransitionDraft(seed = {}) {
  const kind = typeof seed.kind === "string" ? seed.kind : "flag_set";
  return {
    from_state: typeof seed.from_state === "string" ? seed.from_state : "",
    to_state: typeof seed.to_state === "string" ? seed.to_state : "",
    condition: createDefaultCondition(kind),
  };
}

/**
 * Validate + normalize a transition draft into command payload shape.
 * @param {{ from_state: string, to_state: string, condition: object }} draft
 * @returns {{ from_state: string, to_state: string, condition: object }}
 */
export function finalizeTransitionDraft(draft) {
  return normalizeAnimationTransitionRule(draft);
}
