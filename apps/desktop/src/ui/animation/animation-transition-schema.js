/**
 * Normalize and validate animation transition condition payloads used by
 * `animation_set_transitions`.
 */

function toInt(value, fieldName) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`animation transition condition field '${fieldName}' must be a finite number`);
  }
  return Math.trunc(n);
}

function toStringRequired(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`animation transition condition field '${fieldName}' must be a non-empty string`);
  }
  return value.trim();
}

/**
 * @param {any} condition
 * @returns {object}
 */
export function normalizeAnimationCondition(condition) {
  if (!condition || typeof condition !== "object") {
    throw new Error("animation transition condition must be an object");
  }
  const kind = toStringRequired(condition.kind, "kind");
  switch (kind) {
    case "flag_set":
      return {
        kind,
        flag: toStringRequired(condition.flag, "flag"),
      };
    case "flag_set_for_ticks":
      return {
        kind,
        flag: toStringRequired(condition.flag, "flag"),
        min_ticks: toInt(condition.min_ticks, "min_ticks"),
      };
    case "int_gte":
    case "int_lte":
    case "int_gt":
    case "int_lt":
    case "int_eq":
      return {
        kind,
        key: toStringRequired(condition.key, "key"),
        value: toInt(condition.value, "value"),
      };
    case "int_between": {
      const min = toInt(condition.min, "min");
      const max = toInt(condition.max, "max");
      if (min > max) {
        throw new Error("animation transition condition 'int_between' requires min <= max");
      }
      return {
        kind,
        key: toStringRequired(condition.key, "key"),
        min,
        max,
      };
    }
    case "clip_finished":
    case "never":
      return { kind };
    default:
      throw new Error(`unsupported animation transition condition kind '${kind}'`);
  }
}

/**
 * @param {any} rule
 * @returns {{ from_state: string, to_state: string, condition: object }}
 */
export function normalizeAnimationTransitionRule(rule) {
  if (!rule || typeof rule !== "object") {
    throw new Error("animation transition rule must be an object");
  }
  return {
    from_state: toStringRequired(rule.from_state, "from_state"),
    to_state: toStringRequired(rule.to_state, "to_state"),
    condition: normalizeAnimationCondition(rule.condition),
  };
}

/**
 * @param {any} transitions
 * @returns {Array<{ from_state: string, to_state: string, condition: object }>}
 */
export function normalizeAnimationTransitions(transitions) {
  if (!Array.isArray(transitions)) {
    throw new Error("animation transitions must be an array");
  }
  return transitions.map((rule) => normalizeAnimationTransitionRule(rule));
}
