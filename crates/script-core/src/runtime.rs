use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::graph::{ScriptGraph, ScriptNode, ScriptNodeBehavior, ScriptNodeKind, StateScope};

/// Mutable state that scripts read from and write to during execution.
/// Persists across ticks within a single playtest session.
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct ScriptState {
    pub flags: HashMap<String, bool>,
    pub variables: HashMap<String, i64>,
}

impl ScriptState {
    pub fn get_flag(&self, name: &str) -> bool {
        self.flags.get(name).copied().unwrap_or(false)
    }

    pub fn set_flag(&mut self, name: impl Into<String>, value: bool) {
        self.flags.insert(name.into(), value);
    }

    pub fn get_variable(&self, name: &str) -> i64 {
        self.variables.get(name).copied().unwrap_or(0)
    }

    pub fn set_variable(&mut self, name: impl Into<String>, value: i64) {
        self.variables.insert(name.into(), value);
    }
}

/// An effect produced by script execution. The caller (editor runtime) is
/// responsible for applying these effects to the game world.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ScriptEffect {
    SetFlag { flag: String, value: bool, #[serde(default)] scope: StateScope },
    SetVariable { variable: String, value: i64, #[serde(default)] scope: StateScope },
    /// Add one of the given item to the player's inventory.
    GiveItem { item_id: String },
    /// Remove one of the given item from the player's inventory.
    RemoveItem { item_id: String },
    /// Change the named entity's runtime state string.
    SetEntityState { entity_id: String, state: String },
    /// Display a one-line message to the player.
    ShowMessage { text: String },
    ChangeScene { target_scene: String, spawn_point: Option<String> },
    PlayAudio { audio_id: String },
    LogMessage { message: String },
    /// Spawn a new entity from the named prefab at tile position (x, y).
    SpawnEntity { prefab_id: String, x: i32, y: i32 },
    /// Remove the named entity from the scene.
    DespawnEntity { entity_name: String },
}

/// Result of processing one event through the script graph.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ScriptTickResult {
    pub effects: Vec<ScriptEffect>,
    pub nodes_visited: Vec<String>,
}

/// Pre-compiled lookup tables for fast event-driven graph traversal.
/// Built from a validated `ScriptGraph`.
pub struct ScriptRuntime {
    nodes: HashMap<String, ScriptNode>,
    /// Edges keyed by source node id. For condition nodes, edges may carry
    /// a "true"/"false" label.
    edges_from: HashMap<String, Vec<CompiledEdge>>,
    /// Event nodes indexed by their trigger event name.
    event_triggers: HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone)]
struct CompiledEdge {
    to: String,
    label: Option<String>,
}

/// Maximum number of nodes the runtime will visit in a single event
/// traversal before bailing out. Prevents runaway execution from
/// malformed graphs that pass cycle detection (e.g. very long chains).
const MAX_TRAVERSAL_DEPTH: usize = 256;

impl ScriptRuntime {
    /// Compile a validated graph into an executable runtime. The graph
    /// should pass `validate()` before calling this.
    pub fn compile(graph: &ScriptGraph) -> Self {
        let mut nodes = HashMap::new();
        let mut edges_from: HashMap<String, Vec<CompiledEdge>> = HashMap::new();
        let mut event_triggers: HashMap<String, Vec<String>> = HashMap::new();

        for node in &graph.nodes {
            nodes.insert(node.id.clone(), node.clone());
            edges_from.entry(node.id.clone()).or_default();

            if node.kind == ScriptNodeKind::Event {
                match &node.behavior {
                    Some(ScriptNodeBehavior::OnEvent { event }) => {
                        event_triggers
                            .entry(event.clone())
                            .or_default()
                            .push(node.id.clone());
                    }
                    Some(ScriptNodeBehavior::OnInteract) => {
                        event_triggers
                            .entry("on_interact".to_string())
                            .or_default()
                            .push(node.id.clone());
                    }
                    _ => {}
                }
            }
        }

        for edge in &graph.edges {
            edges_from
                .entry(edge.from.clone())
                .or_default()
                .push(CompiledEdge {
                    to: edge.to.clone(),
                    label: edge.label.clone(),
                });
        }

        Self {
            nodes,
            edges_from,
            event_triggers,
        }
    }

    /// Process a named gameplay event. Finds all event nodes that listen
    /// for this event name, then traverses downstream nodes, evaluating
    /// conditions and collecting action effects.
    ///
    /// State mutations (SetFlag, SetVariable) are applied immediately to
    /// the appropriate state bucket so that downstream condition checks
    /// within the same event see updated values. External effects
    /// (ChangeScene, PlayAudio, GiveItem, etc.) are returned as `ScriptEffect`
    /// values for the caller to apply.
    ///
    /// `global_state` persists across scene transitions.
    /// `scene_state` resets when leaving a scene.
    /// `inventory` is the caller-supplied item map (item_id → quantity) used by
    /// `HasItem` condition nodes. Pass an empty map if inventory is unavailable.
    pub fn process_event(
        &self,
        event_name: &str,
        global_state: &mut ScriptState,
        scene_state: &mut ScriptState,
        inventory: &std::collections::HashMap<String, u32>,
    ) -> ScriptTickResult {
        let mut result = ScriptTickResult::default();

        let trigger_nodes = match self.event_triggers.get(event_name) {
            Some(nodes) => nodes.clone(),
            None => return result,
        };

        for start_node_id in trigger_nodes {
            result.nodes_visited.push(start_node_id.clone());
            self.traverse_from(&start_node_id, global_state, scene_state, inventory, &mut result, 0);
        }

        result
    }

    /// Returns all event names that have at least one trigger node.
    pub fn registered_events(&self) -> Vec<String> {
        self.event_triggers.keys().cloned().collect()
    }

    fn traverse_from(
        &self,
        node_id: &str,
        global_state: &mut ScriptState,
        scene_state: &mut ScriptState,
        inventory: &std::collections::HashMap<String, u32>,
        result: &mut ScriptTickResult,
        depth: usize,
    ) {
        if depth >= MAX_TRAVERSAL_DEPTH {
            result.effects.push(ScriptEffect::LogMessage {
                message: format!(
                    "script traversal depth limit reached at node '{node_id}'"
                ),
            });
            return;
        }

        let edges = match self.edges_from.get(node_id) {
            Some(edges) => edges.clone(),
            None => return,
        };

        for edge in edges {
            let Some(target_node) = self.nodes.get(&edge.to) else {
                continue;
            };

            // For condition nodes, evaluate and filter edges by label.
            if target_node.kind == ScriptNodeKind::Condition {
                let condition_result = self.evaluate_condition(target_node, global_state, scene_state, inventory);
                result.nodes_visited.push(target_node.id.clone());

                // Follow edges from this condition node that match the result.
                let branch_label = if condition_result { "true" } else { "false" };
                self.traverse_condition_branches(
                    &target_node.id,
                    branch_label,
                    global_state,
                    scene_state,
                    inventory,
                    result,
                    depth + 1,
                );
                continue;
            }

            // For action nodes, execute the behavior and collect effects.
            if target_node.kind == ScriptNodeKind::Action {
                result.nodes_visited.push(target_node.id.clone());
                self.execute_action(target_node, global_state, scene_state, result);
                self.traverse_from(&target_node.id, global_state, scene_state, inventory, result, depth + 1);
                continue;
            }

            // For expression/other nodes, just continue traversal.
            result.nodes_visited.push(target_node.id.clone());
            self.traverse_from(&target_node.id, global_state, scene_state, inventory, result, depth + 1);
        }
    }

    fn traverse_condition_branches(
        &self,
        condition_node_id: &str,
        branch_label: &str,
        global_state: &mut ScriptState,
        scene_state: &mut ScriptState,
        inventory: &std::collections::HashMap<String, u32>,
        result: &mut ScriptTickResult,
        depth: usize,
    ) {
        let edges = match self.edges_from.get(condition_node_id) {
            Some(edges) => edges.clone(),
            None => return,
        };

        for edge in edges {
            // Match labeled edges to the condition result.
            // Unlabeled edges from conditions are treated as "true" (default path).
            let edge_matches = match &edge.label {
                Some(label) => label == branch_label,
                None => branch_label == "true",
            };
            if !edge_matches {
                continue;
            }

            let Some(target_node) = self.nodes.get(&edge.to) else {
                continue;
            };

            if target_node.kind == ScriptNodeKind::Condition {
                let nested_result = self.evaluate_condition(target_node, global_state, scene_state, inventory);
                result.nodes_visited.push(target_node.id.clone());
                let nested_label = if nested_result { "true" } else { "false" };
                self.traverse_condition_branches(
                    &target_node.id,
                    nested_label,
                    global_state,
                    scene_state,
                    inventory,
                    result,
                    depth + 1,
                );
                continue;
            }

            if target_node.kind == ScriptNodeKind::Action {
                result.nodes_visited.push(target_node.id.clone());
                self.execute_action(target_node, global_state, scene_state, result);
                self.traverse_from(&target_node.id, global_state, scene_state, inventory, result, depth + 1);
                continue;
            }

            result.nodes_visited.push(target_node.id.clone());
            self.traverse_from(&target_node.id, global_state, scene_state, inventory, result, depth + 1);
        }
    }

    fn resolve_state<'a>(
        global_state: &'a ScriptState,
        scene_state: &'a ScriptState,
        scope: StateScope,
    ) -> &'a ScriptState {
        match scope {
            StateScope::Global => global_state,
            StateScope::Scene => scene_state,
        }
    }

    fn resolve_state_mut<'a>(
        global_state: &'a mut ScriptState,
        scene_state: &'a mut ScriptState,
        scope: StateScope,
    ) -> &'a mut ScriptState {
        match scope {
            StateScope::Global => global_state,
            StateScope::Scene => scene_state,
        }
    }

    fn evaluate_condition(
        &self,
        node: &ScriptNode,
        global_state: &ScriptState,
        scene_state: &ScriptState,
        inventory: &std::collections::HashMap<String, u32>,
    ) -> bool {
        match &node.behavior {
            Some(ScriptNodeBehavior::CheckFlag { flag, expected, scope }) => {
                let state = Self::resolve_state(global_state, scene_state, *scope);
                state.get_flag(flag) == *expected
            }
            Some(ScriptNodeBehavior::HasItem { item_id }) => {
                inventory.get(item_id).copied().unwrap_or(0) > 0
            }
            _ => true,
        }
    }

    fn execute_action(
        &self,
        node: &ScriptNode,
        global_state: &mut ScriptState,
        scene_state: &mut ScriptState,
        result: &mut ScriptTickResult,
    ) {
        let Some(behavior) = &node.behavior else {
            return;
        };

        match behavior {
            ScriptNodeBehavior::SetFlag { flag, value, scope } => {
                let state = Self::resolve_state_mut(global_state, scene_state, *scope);
                state.set_flag(flag.clone(), *value);
                result.effects.push(ScriptEffect::SetFlag {
                    flag: flag.clone(),
                    value: *value,
                    scope: *scope,
                });
            }
            ScriptNodeBehavior::SetVariable { variable, value, scope } => {
                let state = Self::resolve_state_mut(global_state, scene_state, *scope);
                state.set_variable(variable.clone(), *value);
                result.effects.push(ScriptEffect::SetVariable {
                    variable: variable.clone(),
                    value: *value,
                    scope: *scope,
                });
            }
            ScriptNodeBehavior::ChangeScene {
                target_scene,
                spawn_point,
            } => {
                result.effects.push(ScriptEffect::ChangeScene {
                    target_scene: target_scene.clone(),
                    spawn_point: spawn_point.clone(),
                });
            }
            ScriptNodeBehavior::PlayAudio { audio_id } => {
                result.effects.push(ScriptEffect::PlayAudio {
                    audio_id: audio_id.clone(),
                });
            }
            ScriptNodeBehavior::GiveItem { item_id } => {
                result.effects.push(ScriptEffect::GiveItem {
                    item_id: item_id.clone(),
                });
            }
            ScriptNodeBehavior::RemoveItem { item_id } => {
                result.effects.push(ScriptEffect::RemoveItem {
                    item_id: item_id.clone(),
                });
            }
            ScriptNodeBehavior::SetEntityState { entity_id, state } => {
                result.effects.push(ScriptEffect::SetEntityState {
                    entity_id: entity_id.clone(),
                    state: state.clone(),
                });
            }
            ScriptNodeBehavior::ShowMessage { text } => {
                result.effects.push(ScriptEffect::ShowMessage {
                    text: text.clone(),
                });
            }
            ScriptNodeBehavior::LogMessage { message } => {
                result.effects.push(ScriptEffect::LogMessage {
                    message: message.clone(),
                });
            }
            ScriptNodeBehavior::SpawnEntity { prefab_id, x, y } => {
                result.effects.push(ScriptEffect::SpawnEntity {
                    prefab_id: prefab_id.clone(),
                    x: *x,
                    y: *y,
                });
            }
            ScriptNodeBehavior::DespawnEntity { entity_name } => {
                result.effects.push(ScriptEffect::DespawnEntity {
                    entity_name: entity_name.clone(),
                });
            }
            // Event/condition behaviors used as actions are no-ops.
            ScriptNodeBehavior::OnEvent { .. }
            | ScriptNodeBehavior::OnInteract
            | ScriptNodeBehavior::CheckFlag { .. }
            | ScriptNodeBehavior::HasItem { .. } => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::graph::{ScriptEdge, ScriptGraph, ScriptNode, ScriptNodeBehavior, ScriptNodeKind, StateScope};

    use super::*;

    fn event_node(id: &str, event: &str) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Event,
            behavior: Some(ScriptNodeBehavior::OnEvent {
                event: event.to_string(),
            }),
        }
    }

    fn condition_node(id: &str, flag: &str, expected: bool) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Condition,
            behavior: Some(ScriptNodeBehavior::CheckFlag {
                flag: flag.to_string(),
                expected,
                scope: StateScope::Global,
            }),
        }
    }

    fn set_flag_node(id: &str, flag: &str, value: bool) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Action,
            behavior: Some(ScriptNodeBehavior::SetFlag {
                flag: flag.to_string(),
                value,
                scope: StateScope::Global,
            }),
        }
    }

    fn set_variable_node(id: &str, variable: &str, value: i64) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Action,
            behavior: Some(ScriptNodeBehavior::SetVariable {
                variable: variable.to_string(),
                value,
                scope: StateScope::Global,
            }),
        }
    }

    fn change_scene_node(id: &str, target: &str) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Action,
            behavior: Some(ScriptNodeBehavior::ChangeScene {
                target_scene: target.to_string(),
                spawn_point: None,
            }),
        }
    }

    fn log_node(id: &str, message: &str) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Action,
            behavior: Some(ScriptNodeBehavior::LogMessage {
                message: message.to_string(),
            }),
        }
    }

    fn edge(from: &str, to: &str) -> ScriptEdge {
        ScriptEdge {
            from: from.to_string(),
            to: to.to_string(),
            label: None,
        }
    }

    fn labeled_edge(from: &str, to: &str, label: &str) -> ScriptEdge {
        ScriptEdge {
            from: from.to_string(),
            to: to.to_string(),
            label: Some(label.to_string()),
        }
    }

    #[test]
    fn simple_event_to_action_sets_flag() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "interact"),
                set_flag_node("act", "door_open", true),
            ],
            edges: vec![edge("ev", "act")],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut state = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("interact", &mut state, &mut scene, &Default::default());
        assert!(state.get_flag("door_open"));
        assert_eq!(result.effects.len(), 1);
        assert_eq!(
            result.effects[0],
            ScriptEffect::SetFlag {
                flag: "door_open".to_string(),
                value: true,
                scope: StateScope::Global,
            }
        );
        assert_eq!(result.nodes_visited, vec!["ev", "act"]);
    }

    #[test]
    fn unregistered_event_produces_no_effects() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "interact"),
                set_flag_node("act", "flag", true),
            ],
            edges: vec![edge("ev", "act")],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut state = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("unknown_event", &mut state, &mut scene, &Default::default());
        assert!(result.effects.is_empty());
        assert!(result.nodes_visited.is_empty());
    }

    #[test]
    fn condition_true_branch_executes() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "enter_zone"),
                condition_node("cond", "has_key", true),
                log_node("yes", "door opened"),
                log_node("no", "need a key"),
            ],
            edges: vec![
                edge("ev", "cond"),
                labeled_edge("cond", "yes", "true"),
                labeled_edge("cond", "no", "false"),
            ],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut state = ScriptState::default();
        let mut scene = ScriptState::default();
        state.set_flag("has_key", true);

        let result = rt.process_event("enter_zone", &mut state, &mut scene, &Default::default());
        assert_eq!(result.effects.len(), 1);
        assert_eq!(
            result.effects[0],
            ScriptEffect::LogMessage {
                message: "door opened".to_string()
            }
        );
        assert!(result.nodes_visited.contains(&"yes".to_string()));
        assert!(!result.nodes_visited.contains(&"no".to_string()));
    }

    #[test]
    fn condition_false_branch_executes() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "enter_zone"),
                condition_node("cond", "has_key", true),
                log_node("yes", "door opened"),
                log_node("no", "need a key"),
            ],
            edges: vec![
                edge("ev", "cond"),
                labeled_edge("cond", "yes", "true"),
                labeled_edge("cond", "no", "false"),
            ],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut state = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("enter_zone", &mut state, &mut scene, &Default::default());
        assert_eq!(result.effects.len(), 1);
        assert_eq!(
            result.effects[0],
            ScriptEffect::LogMessage {
                message: "need a key".to_string()
            }
        );
        assert!(result.nodes_visited.contains(&"no".to_string()));
        assert!(!result.nodes_visited.contains(&"yes".to_string()));
    }

    #[test]
    fn set_flag_then_check_within_same_event() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "pickup_key"),
                set_flag_node("set", "has_key", true),
                condition_node("cond", "has_key", true),
                log_node("result", "key acquired and verified"),
            ],
            edges: vec![
                edge("ev", "set"),
                edge("set", "cond"),
                labeled_edge("cond", "result", "true"),
            ],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut state = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("pickup_key", &mut state, &mut scene, &Default::default());
        assert!(state.get_flag("has_key"));
        assert_eq!(result.effects.len(), 2); // SetFlag + LogMessage
        assert!(result.nodes_visited.contains(&"result".to_string()));
    }

    #[test]
    fn change_scene_effect_is_emitted() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "exit_door"),
                change_scene_node("go", "level_2"),
            ],
            edges: vec![edge("ev", "go")],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut state = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("exit_door", &mut state, &mut scene, &Default::default());
        assert_eq!(result.effects.len(), 1);
        assert_eq!(
            result.effects[0],
            ScriptEffect::ChangeScene {
                target_scene: "level_2".to_string(),
                spawn_point: None,
            }
        );
    }

    #[test]
    fn set_variable_effect_is_emitted_and_applied() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "score"),
                set_variable_node("set", "points", 100),
            ],
            edges: vec![edge("ev", "set")],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut state = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("score", &mut state, &mut scene, &Default::default());
        assert_eq!(state.get_variable("points"), 100);
        assert_eq!(result.effects.len(), 1);
        assert_eq!(
            result.effects[0],
            ScriptEffect::SetVariable {
                variable: "points".to_string(),
                value: 100,
                scope: StateScope::Global,
            }
        );
    }

    #[test]
    fn multiple_event_listeners_for_same_event() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev1", "interact"),
                event_node("ev2", "interact"),
                set_flag_node("act1", "flag_a", true),
                set_flag_node("act2", "flag_b", true),
            ],
            edges: vec![edge("ev1", "act1"), edge("ev2", "act2")],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut state = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("interact", &mut state, &mut scene, &Default::default());
        assert!(state.get_flag("flag_a"));
        assert!(state.get_flag("flag_b"));
        assert_eq!(result.effects.len(), 2);
    }

    #[test]
    fn chain_of_actions_executes_sequentially() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "quest_complete"),
                set_flag_node("a1", "quest_done", true),
                set_variable_node("a2", "xp", 50),
                log_node("a3", "quest finished"),
            ],
            edges: vec![
                edge("ev", "a1"),
                edge("a1", "a2"),
                edge("a2", "a3"),
            ],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut state = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("quest_complete", &mut state, &mut scene, &Default::default());
        assert!(state.get_flag("quest_done"));
        assert_eq!(state.get_variable("xp"), 50);
        assert_eq!(result.effects.len(), 3);
        assert_eq!(
            result.nodes_visited,
            vec!["ev", "a1", "a2", "a3"]
        );
    }

    #[test]
    fn registered_events_returns_all_triggers() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev1", "interact"),
                event_node("ev2", "enter_zone"),
                set_flag_node("act", "f", true),
            ],
            edges: vec![edge("ev1", "act"), edge("ev2", "act")],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut events = rt.registered_events();
        events.sort();
        assert_eq!(events, vec!["enter_zone", "interact"]);
    }

    #[test]
    fn script_state_defaults_are_safe() {
        let state = ScriptState::default();
        assert!(!state.get_flag("nonexistent"));
        assert_eq!(state.get_variable("nonexistent"), 0);
    }

    #[test]
    fn empty_graph_compiles_and_runs_safely() {
        let graph = ScriptGraph {
            nodes: vec![],
            edges: vec![],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut state = ScriptState::default();
        let mut scene = ScriptState::default();
        let result = rt.process_event("anything", &mut state, &mut scene, &Default::default());
        assert!(result.effects.is_empty());
    }

    #[test]
    fn node_without_behavior_is_traversed_without_effect() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "test"),
                ScriptNode {
                    id: "passthrough".to_string(),
                    kind: ScriptNodeKind::Action,
                    behavior: None,
                },
                log_node("end", "reached"),
            ],
            edges: vec![
                edge("ev", "passthrough"),
                edge("passthrough", "end"),
            ],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut state = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("test", &mut state, &mut scene, &Default::default());
        assert_eq!(result.effects.len(), 1);
        assert_eq!(
            result.effects[0],
            ScriptEffect::LogMessage {
                message: "reached".to_string()
            }
        );
        assert!(result.nodes_visited.contains(&"passthrough".to_string()));
    }

    #[test]
    fn play_audio_effect_is_emitted() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "collect"),
                ScriptNode {
                    id: "sfx".to_string(),
                    kind: ScriptNodeKind::Action,
                    behavior: Some(ScriptNodeBehavior::PlayAudio {
                        audio_id: "coin_sfx".to_string(),
                    }),
                },
            ],
            edges: vec![edge("ev", "sfx")],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut state = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("collect", &mut state, &mut scene, &Default::default());
        assert_eq!(result.effects.len(), 1);
        assert_eq!(
            result.effects[0],
            ScriptEffect::PlayAudio {
                audio_id: "coin_sfx".to_string()
            }
        );
    }

    // ── Scene-scoped state tests ────────────────────────────────────────

    fn set_scene_flag_node(id: &str, flag: &str, value: bool) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Action,
            behavior: Some(ScriptNodeBehavior::SetFlag {
                flag: flag.to_string(),
                value,
                scope: StateScope::Scene,
            }),
        }
    }

    fn check_scene_flag_node(id: &str, flag: &str, expected: bool) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Condition,
            behavior: Some(ScriptNodeBehavior::CheckFlag {
                flag: flag.to_string(),
                expected,
                scope: StateScope::Scene,
            }),
        }
    }

    fn set_scene_variable_node(id: &str, variable: &str, value: i64) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Action,
            behavior: Some(ScriptNodeBehavior::SetVariable {
                variable: variable.to_string(),
                value,
                scope: StateScope::Scene,
            }),
        }
    }

    #[test]
    fn scene_scope_flag_writes_to_scene_state() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "enter"),
                set_scene_flag_node("act", "visited", true),
            ],
            edges: vec![edge("ev", "act")],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut global = ScriptState::default();
        let mut scene = ScriptState::default();

        rt.process_event("enter", &mut global, &mut scene, &Default::default());
        // Scene state has the flag, global does not
        assert!(scene.get_flag("visited"));
        assert!(!global.get_flag("visited"));
    }

    #[test]
    fn scene_scope_variable_writes_to_scene_state() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "solve"),
                set_scene_variable_node("act", "puzzle_progress", 3),
            ],
            edges: vec![edge("ev", "act")],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut global = ScriptState::default();
        let mut scene = ScriptState::default();

        rt.process_event("solve", &mut global, &mut scene, &Default::default());
        assert_eq!(scene.get_variable("puzzle_progress"), 3);
        assert_eq!(global.get_variable("puzzle_progress"), 0);
    }

    #[test]
    fn scene_scope_check_reads_scene_state() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "check"),
                check_scene_flag_node("cond", "room_cleared", true),
                log_node("yes", "cleared"),
                log_node("no", "not cleared"),
            ],
            edges: vec![
                edge("ev", "cond"),
                labeled_edge("cond", "yes", "true"),
                labeled_edge("cond", "no", "false"),
            ],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut global = ScriptState::default();
        let mut scene = ScriptState::default();

        // Flag only in scene state
        scene.set_flag("room_cleared", true);
        let result = rt.process_event("check", &mut global, &mut scene, &Default::default());
        assert!(result.nodes_visited.contains(&"yes".to_string()));
    }

    #[test]
    fn mixed_scope_flags_are_independent() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "action"),
                set_flag_node("g", "quest_done", true),
                set_scene_flag_node("s", "door_open", true),
            ],
            edges: vec![
                edge("ev", "g"),
                edge("g", "s"),
            ],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut global = ScriptState::default();
        let mut scene = ScriptState::default();

        rt.process_event("action", &mut global, &mut scene, &Default::default());
        assert!(global.get_flag("quest_done"));
        assert!(!global.get_flag("door_open"));
        assert!(scene.get_flag("door_open"));
        assert!(!scene.get_flag("quest_done"));
    }

    // -----------------------------------------------------------------------
    // S4-EG1: new behavior tests
    // -----------------------------------------------------------------------

    fn on_interact_node(id: &str) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Event,
            behavior: Some(ScriptNodeBehavior::OnInteract),
        }
    }

    fn has_item_node(id: &str, item_id: &str) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Condition,
            behavior: Some(ScriptNodeBehavior::HasItem {
                item_id: item_id.to_string(),
            }),
        }
    }

    fn give_item_node(id: &str, item_id: &str) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Action,
            behavior: Some(ScriptNodeBehavior::GiveItem {
                item_id: item_id.to_string(),
            }),
        }
    }

    fn show_message_node(id: &str, text: &str) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Action,
            behavior: Some(ScriptNodeBehavior::ShowMessage {
                text: text.to_string(),
            }),
        }
    }

    fn set_entity_state_node(id: &str, entity_id: &str, state: &str) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Action,
            behavior: Some(ScriptNodeBehavior::SetEntityState {
                entity_id: entity_id.to_string(),
                state: state.to_string(),
            }),
        }
    }

    #[test]
    fn give_item_effect_is_emitted_when_on_interact_fires() {
        let graph = ScriptGraph {
            nodes: vec![
                on_interact_node("trigger"),
                give_item_node("give", "key"),
            ],
            edges: vec![edge("trigger", "give")],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut global = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("on_interact", &mut global, &mut scene, &Default::default());
        assert_eq!(result.nodes_visited, vec!["trigger", "give"]);
        assert!(result.effects.iter().any(|e| matches!(
            e,
            ScriptEffect::GiveItem { item_id } if item_id == "key"
        )));
    }

    #[test]
    fn has_item_condition_blocks_actions_when_inventory_empty() {
        let graph = ScriptGraph {
            nodes: vec![
                on_interact_node("trigger"),
                has_item_node("cond", "key"),
                show_message_node("msg_yes", "Unlocked!"),
                show_message_node("msg_no", "Locked!"),
            ],
            edges: vec![
                edge("trigger", "cond"),
                labeled_edge("cond", "msg_yes", "true"),
                labeled_edge("cond", "msg_no", "false"),
            ],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut global = ScriptState::default();
        let mut scene = ScriptState::default();
        let empty_inv: std::collections::HashMap<String, u32> = Default::default();

        let result = rt.process_event("on_interact", &mut global, &mut scene, &empty_inv);
        assert!(result.nodes_visited.contains(&"msg_no".to_string()));
        assert!(!result.nodes_visited.contains(&"msg_yes".to_string()));
    }

    #[test]
    fn has_item_condition_passes_when_item_present() {
        let graph = ScriptGraph {
            nodes: vec![
                on_interact_node("trigger"),
                has_item_node("cond", "key"),
                show_message_node("msg_yes", "Unlocked!"),
                show_message_node("msg_no", "Locked!"),
            ],
            edges: vec![
                edge("trigger", "cond"),
                labeled_edge("cond", "msg_yes", "true"),
                labeled_edge("cond", "msg_no", "false"),
            ],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut global = ScriptState::default();
        let mut scene = ScriptState::default();
        let mut inv = std::collections::HashMap::new();
        inv.insert("key".to_string(), 1u32);

        let result = rt.process_event("on_interact", &mut global, &mut scene, &inv);
        assert!(result.nodes_visited.contains(&"msg_yes".to_string()));
        assert!(!result.nodes_visited.contains(&"msg_no".to_string()));
    }

    #[test]
    fn set_entity_state_effect_is_emitted() {
        let graph = ScriptGraph {
            nodes: vec![
                on_interact_node("trigger"),
                set_entity_state_node("open_chest", "chest_01", "open"),
            ],
            edges: vec![edge("trigger", "open_chest")],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut global = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("on_interact", &mut global, &mut scene, &Default::default());
        assert!(result.effects.iter().any(|e| matches!(
            e,
            ScriptEffect::SetEntityState { entity_id, state }
                if entity_id == "chest_01" && state == "open"
        )));
    }

    #[test]
    fn show_message_effect_is_emitted() {
        let graph = ScriptGraph {
            nodes: vec![
                on_interact_node("trigger"),
                show_message_node("msg", "You got the Key!"),
            ],
            edges: vec![edge("trigger", "msg")],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut global = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("on_interact", &mut global, &mut scene, &Default::default());
        assert!(result.effects.iter().any(|e| matches!(
            e,
            ScriptEffect::ShowMessage { text } if text == "You got the Key!"
        )));
    }

    // ── S4-G1: spawn/despawn tests ──────────────────────────────────────

    fn spawn_entity_node(id: &str, prefab_id: &str, x: i32, y: i32) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Action,
            behavior: Some(ScriptNodeBehavior::SpawnEntity {
                prefab_id: prefab_id.to_string(),
                x,
                y,
            }),
        }
    }

    fn despawn_entity_node(id: &str, entity_name: &str) -> ScriptNode {
        ScriptNode {
            id: id.to_string(),
            kind: ScriptNodeKind::Action,
            behavior: Some(ScriptNodeBehavior::DespawnEntity {
                entity_name: entity_name.to_string(),
            }),
        }
    }

    #[test]
    fn spawn_entity_effect_is_emitted() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "wave_start"),
                spawn_entity_node("spawn", "enemy_slime", 5, 3),
            ],
            edges: vec![edge("ev", "spawn")],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut state = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("wave_start", &mut state, &mut scene, &Default::default());
        assert_eq!(result.effects.len(), 1);
        assert!(result.effects.iter().any(|e| matches!(
            e,
            ScriptEffect::SpawnEntity { prefab_id, x, y }
                if prefab_id == "enemy_slime" && *x == 5 && *y == 3
        )));
    }

    #[test]
    fn despawn_entity_effect_is_emitted() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "boss_defeat"),
                despawn_entity_node("despawn", "minion_a"),
            ],
            edges: vec![edge("ev", "despawn")],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut state = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("boss_defeat", &mut state, &mut scene, &Default::default());
        assert_eq!(result.effects.len(), 1);
        assert!(result.effects.iter().any(|e| matches!(
            e,
            ScriptEffect::DespawnEntity { entity_name } if entity_name == "minion_a"
        )));
    }

    #[test]
    fn spawn_and_despawn_chain_emits_both_effects() {
        let graph = ScriptGraph {
            nodes: vec![
                event_node("ev", "phase_change"),
                spawn_entity_node("spawn", "enemy_knight", 8, 2),
                despawn_entity_node("despawn", "enemy_grunt"),
            ],
            edges: vec![edge("ev", "spawn"), edge("spawn", "despawn")],
        };
        let rt = ScriptRuntime::compile(&graph);
        let mut state = ScriptState::default();
        let mut scene = ScriptState::default();

        let result = rt.process_event("phase_change", &mut state, &mut scene, &Default::default());
        assert_eq!(result.effects.len(), 2);
        assert!(result.effects.iter().any(|e| matches!(e, ScriptEffect::SpawnEntity { .. })));
        assert!(result.effects.iter().any(|e| matches!(e, ScriptEffect::DespawnEntity { .. })));
    }
}
