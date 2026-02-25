use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

/// Typed runtime parameters for animation transitions.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnimatorParameters {
    #[serde(default)]
    bools: HashMap<String, bool>,
    #[serde(default)]
    ints: HashMap<String, i32>,
    #[serde(default)]
    triggers: HashSet<String>,
}

impl AnimatorParameters {
    pub fn set_bool(&mut self, key: impl Into<String>, value: bool) {
        self.bools.insert(key.into(), value);
    }

    pub fn get_bool(&self, key: &str) -> bool {
        self.bools.get(key).copied().unwrap_or(false)
    }

    pub fn set_int(&mut self, key: impl Into<String>, value: i32) {
        self.ints.insert(key.into(), value);
    }

    pub fn get_int(&self, key: &str) -> i32 {
        self.ints.get(key).copied().unwrap_or(0)
    }

    /// Trigger becomes true once, then is consumed and reset on read.
    pub fn set_trigger(&mut self, key: impl Into<String>) {
        self.triggers.insert(key.into());
    }

    pub fn consume_trigger(&mut self, key: &str) -> bool {
        self.triggers.remove(key)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bool_params_default_false_and_roundtrip_set() {
        let mut p = AnimatorParameters::default();
        assert!(!p.get_bool("is_moving"));
        p.set_bool("is_moving", true);
        assert!(p.get_bool("is_moving"));
    }

    #[test]
    fn int_params_default_zero_and_roundtrip_set() {
        let mut p = AnimatorParameters::default();
        assert_eq!(p.get_int("speed_tier"), 0);
        p.set_int("speed_tier", 2);
        assert_eq!(p.get_int("speed_tier"), 2);
    }

    #[test]
    fn trigger_consumes_once() {
        let mut p = AnimatorParameters::default();
        p.set_trigger("jump");
        assert!(p.consume_trigger("jump"));
        assert!(!p.consume_trigger("jump"));
    }

    #[test]
    fn serialization_roundtrip() {
        let mut p = AnimatorParameters::default();
        p.set_bool("is_moving", true);
        p.set_int("speed_tier", 3);
        p.set_trigger("landed");

        let json = serde_json::to_string(&p).expect("serialize params");
        let mut decoded: AnimatorParameters =
            serde_json::from_str(&json).expect("deserialize params");
        assert!(decoded.get_bool("is_moving"));
        assert_eq!(decoded.get_int("speed_tier"), 3);
        assert!(decoded.consume_trigger("landed"));
        assert!(!decoded.consume_trigger("landed"));
    }
}

