use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

use crate::movement::MovementInput;

/// Semantic game actions decoupled from physical keys.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InputAction {
    MoveUp,
    MoveDown,
    MoveLeft,
    MoveRight,
    ActionA,
    ActionB,
    Start,
    Select,
}

/// Physical key codes that can be mapped to actions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum KeyCode {
    ArrowUp,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    KeyZ,
    KeyX,
    Enter,
    ShiftLeft,
    KeyW,
    KeyA,
    KeyS,
    KeyD,
    Space,
    Escape,
}

/// Maps physical keys to semantic game actions.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputMapping {
    bindings: HashMap<KeyCode, InputAction>,
}

impl Default for InputMapping {
    fn default() -> Self {
        Self::game_boy_defaults()
    }
}

impl InputMapping {
    /// Default key mapping matching Game Boy / NES conventions.
    pub fn game_boy_defaults() -> Self {
        let mut bindings = HashMap::new();
        bindings.insert(KeyCode::ArrowUp, InputAction::MoveUp);
        bindings.insert(KeyCode::ArrowDown, InputAction::MoveDown);
        bindings.insert(KeyCode::ArrowLeft, InputAction::MoveLeft);
        bindings.insert(KeyCode::ArrowRight, InputAction::MoveRight);
        bindings.insert(KeyCode::KeyZ, InputAction::ActionA);
        bindings.insert(KeyCode::KeyX, InputAction::ActionB);
        bindings.insert(KeyCode::Enter, InputAction::Start);
        bindings.insert(KeyCode::ShiftLeft, InputAction::Select);
        Self { bindings }
    }

    /// WASD alternative mapping.
    pub fn wasd_defaults() -> Self {
        let mut bindings = HashMap::new();
        bindings.insert(KeyCode::KeyW, InputAction::MoveUp);
        bindings.insert(KeyCode::KeyS, InputAction::MoveDown);
        bindings.insert(KeyCode::KeyA, InputAction::MoveLeft);
        bindings.insert(KeyCode::KeyD, InputAction::MoveRight);
        bindings.insert(KeyCode::Space, InputAction::ActionA);
        bindings.insert(KeyCode::KeyX, InputAction::ActionB);
        bindings.insert(KeyCode::Enter, InputAction::Start);
        bindings.insert(KeyCode::ShiftLeft, InputAction::Select);
        Self { bindings }
    }

    pub fn action_for_key(&self, key: KeyCode) -> Option<InputAction> {
        self.bindings.get(&key).copied()
    }

    pub fn set_binding(&mut self, key: KeyCode, action: InputAction) {
        self.bindings.insert(key, action);
    }
}

/// Tracks which actions are currently active (held), just pressed, or just released.
#[derive(Debug, Clone, Default)]
pub struct InputState {
    held: HashSet<InputAction>,
    just_pressed: HashSet<InputAction>,
    just_released: HashSet<InputAction>,
}

impl InputState {
    pub fn new() -> Self {
        Self::default()
    }

    /// Call when a key is pressed down. Maps through the binding.
    pub fn key_down(&mut self, key: KeyCode, mapping: &InputMapping) {
        if let Some(action) = mapping.action_for_key(key) {
            if self.held.insert(action) {
                self.just_pressed.insert(action);
            }
        }
    }

    /// Call when a key is released. Maps through the binding.
    pub fn key_up(&mut self, key: KeyCode, mapping: &InputMapping) {
        if let Some(action) = mapping.action_for_key(key) {
            if self.held.remove(&action) {
                self.just_released.insert(action);
            }
        }
    }

    /// Clear per-frame transient state. Call at the start of each tick.
    pub fn tick_reset(&mut self) {
        self.just_pressed.clear();
        self.just_released.clear();
    }

    /// Clear all state (for playtest exit/enter).
    pub fn reset(&mut self) {
        self.held.clear();
        self.just_pressed.clear();
        self.just_released.clear();
    }

    pub fn is_held(&self, action: InputAction) -> bool {
        self.held.contains(&action)
    }

    pub fn is_just_pressed(&self, action: InputAction) -> bool {
        self.just_pressed.contains(&action)
    }

    pub fn is_just_released(&self, action: InputAction) -> bool {
        self.just_released.contains(&action)
    }

    /// Convert current directional input to a MovementInput.
    pub fn to_movement_input(&self) -> MovementInput {
        let mut dx = 0i32;
        let mut dy = 0i32;
        if self.is_held(InputAction::MoveUp) {
            dy -= 1;
        }
        if self.is_held(InputAction::MoveDown) {
            dy += 1;
        }
        if self.is_held(InputAction::MoveLeft) {
            dx -= 1;
        }
        if self.is_held(InputAction::MoveRight) {
            dx += 1;
        }
        MovementInput { dx, dy }
    }

    /// Return list of actions just pressed this tick (for script event firing).
    pub fn actions_just_pressed(&self) -> Vec<InputAction> {
        self.just_pressed.iter().copied().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_mapping_covers_game_boy() {
        let mapping = InputMapping::game_boy_defaults();
        assert_eq!(
            mapping.action_for_key(KeyCode::ArrowUp),
            Some(InputAction::MoveUp)
        );
        assert_eq!(
            mapping.action_for_key(KeyCode::KeyZ),
            Some(InputAction::ActionA)
        );
        assert_eq!(
            mapping.action_for_key(KeyCode::Enter),
            Some(InputAction::Start)
        );
        assert_eq!(mapping.action_for_key(KeyCode::Escape), None);
    }

    #[test]
    fn input_state_key_down_up_cycle() {
        let mapping = InputMapping::default();
        let mut state = InputState::new();

        state.key_down(KeyCode::ArrowRight, &mapping);
        assert!(state.is_held(InputAction::MoveRight));
        assert!(state.is_just_pressed(InputAction::MoveRight));

        state.tick_reset();
        assert!(state.is_held(InputAction::MoveRight));
        assert!(!state.is_just_pressed(InputAction::MoveRight));

        state.key_up(KeyCode::ArrowRight, &mapping);
        assert!(!state.is_held(InputAction::MoveRight));
        assert!(state.is_just_released(InputAction::MoveRight));

        state.tick_reset();
        assert!(!state.is_just_released(InputAction::MoveRight));
    }

    #[test]
    fn to_movement_input_from_held_keys() {
        let mapping = InputMapping::default();
        let mut state = InputState::new();

        // No input
        assert_eq!(state.to_movement_input(), MovementInput { dx: 0, dy: 0 });

        // Hold right + up = diagonal
        state.key_down(KeyCode::ArrowRight, &mapping);
        state.key_down(KeyCode::ArrowUp, &mapping);
        assert_eq!(state.to_movement_input(), MovementInput { dx: 1, dy: -1 });

        // Opposing directions cancel
        state.key_down(KeyCode::ArrowLeft, &mapping);
        assert_eq!(state.to_movement_input(), MovementInput { dx: 0, dy: -1 });
    }

    #[test]
    fn reset_clears_all_state() {
        let mapping = InputMapping::default();
        let mut state = InputState::new();

        state.key_down(KeyCode::ArrowUp, &mapping);
        state.key_down(KeyCode::KeyZ, &mapping);
        assert!(state.is_held(InputAction::MoveUp));
        assert!(state.is_held(InputAction::ActionA));

        state.reset();
        assert!(!state.is_held(InputAction::MoveUp));
        assert!(!state.is_held(InputAction::ActionA));
        assert!(state.actions_just_pressed().is_empty());
    }

    #[test]
    fn duplicate_key_down_does_not_re_trigger_just_pressed() {
        let mapping = InputMapping::default();
        let mut state = InputState::new();

        state.key_down(KeyCode::KeyZ, &mapping);
        assert!(state.is_just_pressed(InputAction::ActionA));
        state.tick_reset();

        // Second key_down without key_up should not re-trigger
        state.key_down(KeyCode::KeyZ, &mapping);
        assert!(!state.is_just_pressed(InputAction::ActionA));
        assert!(state.is_held(InputAction::ActionA));
    }

    #[test]
    fn unmapped_keys_are_ignored() {
        let mapping = InputMapping::default();
        let mut state = InputState::new();

        state.key_down(KeyCode::Escape, &mapping);
        assert!(state.actions_just_pressed().is_empty());

        state.key_up(KeyCode::Escape, &mapping);
        assert!(!state.is_just_released(InputAction::ActionA));
    }

    #[test]
    fn input_mapping_serialization() {
        let mapping = InputMapping::game_boy_defaults();
        let json = serde_json::to_string(&mapping).expect("serialize");
        let deserialized: InputMapping = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(
            deserialized.action_for_key(KeyCode::ArrowUp),
            Some(InputAction::MoveUp)
        );
    }
}
