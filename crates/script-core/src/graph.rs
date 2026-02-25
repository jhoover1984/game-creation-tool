use std::collections::{HashMap, HashSet, VecDeque};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ScriptGraph {
    pub nodes: Vec<ScriptNode>,
    pub edges: Vec<ScriptEdge>,
}

impl ScriptGraph {
    pub fn validate(&self) -> ValidationReport {
        let mut errors = Vec::new();
        let mut node_ids = HashSet::new();
        for node in &self.nodes {
            if node.id.trim().is_empty() {
                errors.push(ValidationError {
                    code: "empty_node_id".to_string(),
                    message: "node id cannot be empty".to_string(),
                    node_id: Some(node.id.clone()),
                });
                continue;
            }
            if !node_ids.insert(node.id.clone()) {
                errors.push(ValidationError {
                    code: "duplicate_node_id".to_string(),
                    message: format!("duplicate node id '{}' was found", node.id),
                    node_id: Some(node.id.clone()),
                });
            }
        }

        let mut edge_keys = HashSet::new();
        for edge in &self.edges {
            if !edge_keys.insert((edge.from.clone(), edge.to.clone())) {
                errors.push(ValidationError {
                    code: "duplicate_edge".to_string(),
                    message: format!("duplicate edge '{} -> {}' was found", edge.from, edge.to),
                    node_id: Some(edge.from.clone()),
                });
            }
            if !self.nodes.iter().any(|node| node.id == edge.from) {
                errors.push(ValidationError {
                    code: "missing_source_node".to_string(),
                    message: format!("edge source node '{}' was not found", edge.from),
                    node_id: Some(edge.from.clone()),
                });
            }
            if !self.nodes.iter().any(|node| node.id == edge.to) {
                errors.push(ValidationError {
                    code: "missing_target_node".to_string(),
                    message: format!("edge target node '{}' was not found", edge.to),
                    node_id: Some(edge.to.clone()),
                });
            }
        }

        if self.has_cycle(&node_ids) {
            errors.push(ValidationError {
                code: "cycle_detected".to_string(),
                message: "script graph contains a cycle".to_string(),
                node_id: None,
            });
        }

        ValidationReport { errors }
    }

    fn has_cycle(&self, node_ids: &HashSet<String>) -> bool {
        if node_ids.is_empty() {
            return false;
        }

        let mut indegree = HashMap::new();
        let mut adjacency = HashMap::<String, Vec<String>>::new();
        for id in node_ids {
            indegree.insert(id.clone(), 0usize);
            adjacency.insert(id.clone(), Vec::new());
        }

        for edge in &self.edges {
            if !node_ids.contains(&edge.from) || !node_ids.contains(&edge.to) {
                continue;
            }
            if let Some(next) = adjacency.get_mut(&edge.from) {
                next.push(edge.to.clone());
            }
            if let Some(deg) = indegree.get_mut(&edge.to) {
                *deg += 1;
            }
        }

        let mut queue = VecDeque::new();
        for (id, deg) in &indegree {
            if *deg == 0 {
                queue.push_back(id.clone());
            }
        }

        let mut visited = 0usize;
        while let Some(id) = queue.pop_front() {
            visited += 1;
            if let Some(next) = adjacency.get(&id) {
                for neighbor in next {
                    if let Some(deg) = indegree.get_mut(neighbor) {
                        *deg -= 1;
                        if *deg == 0 {
                            queue.push_back(neighbor.clone());
                        }
                    }
                }
            }
        }

        visited != node_ids.len()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ScriptNode {
    pub id: String,
    pub kind: ScriptNodeKind,
    #[serde(default)]
    pub behavior: Option<ScriptNodeBehavior>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ScriptNodeKind {
    Event,
    Condition,
    Action,
    Expression,
}

/// Determines whether a flag/variable lives in global or scene-local state.
/// Global state persists across scene transitions; scene state resets when
/// leaving a scene and restores when returning.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum StateScope {
    #[default]
    Global,
    Scene,
}

/// Concrete behavior attached to a node. Determines what happens when the
/// runtime visits this node during graph traversal.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ScriptNodeBehavior {
    /// Fires when a named gameplay event is raised (e.g. "interact", "enter_zone").
    OnEvent {
        event: String,
    },
    /// Fires when the player interacts with the entity this graph belongs to.
    /// Registers as the "on_interact" event trigger in the compiled runtime.
    OnInteract,
    /// Evaluates to true when a named flag equals the expected value.
    CheckFlag {
        flag: String,
        expected: bool,
        #[serde(default)]
        scope: StateScope,
    },
    /// Evaluates to true when the player's inventory contains the given item
    /// (quantity > 0). The runtime caller must supply the current inventory.
    HasItem {
        item_id: String,
    },
    /// Sets a named flag to the given value.
    SetFlag {
        flag: String,
        value: bool,
        #[serde(default)]
        scope: StateScope,
    },
    /// Sets a named integer variable to an explicit value.
    SetVariable {
        variable: String,
        value: i64,
        #[serde(default)]
        scope: StateScope,
    },
    /// Adds one of the given item to the player's inventory.
    GiveItem {
        item_id: String,
    },
    /// Removes one of the given item from the player's inventory (no-op if absent).
    RemoveItem {
        item_id: String,
    },
    /// Changes the named entity's runtime state string (e.g. "open", "locked", "hidden").
    SetEntityState {
        entity_id: String,
        state: String,
    },
    /// Displays a one-line message to the player (popup/toast). Does not block execution.
    ShowMessage {
        text: String,
    },
    /// Requests a scene transition to the named target scene.
    ChangeScene {
        target_scene: String,
        #[serde(default)]
        spawn_point: Option<String>,
    },
    /// Triggers a named audio clip (by audio asset id).
    PlayAudio {
        audio_id: String,
    },
    /// Logs a message to the playtest trace output.
    LogMessage {
        message: String,
    },
    /// Spawns a new entity from the named prefab at tile position (x, y).
    /// The runtime tracks the spawned entity and removes it when playtest exits.
    SpawnEntity {
        prefab_id: String,
        x: i32,
        y: i32,
    },
    /// Removes the entity with the given name from the active scene.
    /// Safe no-op if the entity does not exist.
    DespawnEntity {
        entity_name: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ScriptEdge {
    pub from: String,
    pub to: String,
    /// Optional label for condition branches: "true" or "false".
    /// When absent, the edge is unconditional.
    #[serde(default)]
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ValidationReport {
    pub errors: Vec<ValidationError>,
}

impl ValidationReport {
    pub fn is_valid(&self) -> bool {
        self.errors.is_empty()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ValidationError {
    pub code: String,
    pub message: String,
    pub node_id: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_graph_passes_validation() {
        let graph = ScriptGraph {
            nodes: vec![
                ScriptNode {
                    id: "event_start".to_string(),
                    kind: ScriptNodeKind::Event,
                    behavior: None,
                },
                ScriptNode {
                    id: "action_spawn".to_string(),
                    kind: ScriptNodeKind::Action,
                    behavior: None,
                },
            ],
            edges: vec![ScriptEdge {
                from: "event_start".to_string(),
                to: "action_spawn".to_string(),
                label: None,
            }],
        };

        let report = graph.validate();
        assert!(report.is_valid());
    }

    #[test]
    fn missing_nodes_are_reported() {
        let graph = ScriptGraph {
            nodes: vec![ScriptNode {
                id: "event_start".to_string(),
                kind: ScriptNodeKind::Event,
                behavior: None,
            }],
            edges: vec![ScriptEdge {
                from: "event_missing".to_string(),
                to: "action_missing".to_string(),
                label: None,
            }],
        };

        let report = graph.validate();
        assert!(!report.is_valid());
        assert_eq!(report.errors.len(), 2);
        assert_eq!(report.errors[0].code, "missing_source_node");
        assert_eq!(report.errors[1].code, "missing_target_node");
    }

    #[test]
    fn cycles_are_reported() {
        let graph = ScriptGraph {
            nodes: vec![
                ScriptNode {
                    id: "a".to_string(),
                    kind: ScriptNodeKind::Event,
                    behavior: None,
                },
                ScriptNode {
                    id: "b".to_string(),
                    kind: ScriptNodeKind::Action,
                    behavior: None,
                },
                ScriptNode {
                    id: "c".to_string(),
                    kind: ScriptNodeKind::Condition,
                    behavior: None,
                },
            ],
            edges: vec![
                ScriptEdge {
                    from: "a".to_string(),
                    to: "b".to_string(),
                    label: None,
                },
                ScriptEdge {
                    from: "b".to_string(),
                    to: "c".to_string(),
                    label: None,
                },
                ScriptEdge {
                    from: "c".to_string(),
                    to: "a".to_string(),
                    label: None,
                },
            ],
        };

        let report = graph.validate();
        assert!(report.errors.iter().any(|e| e.code == "cycle_detected"));
    }

    #[test]
    fn duplicate_edges_and_empty_ids_are_reported() {
        let graph = ScriptGraph {
            nodes: vec![
                ScriptNode {
                    id: "".to_string(),
                    kind: ScriptNodeKind::Event,
                    behavior: None,
                },
                ScriptNode {
                    id: "event_start".to_string(),
                    kind: ScriptNodeKind::Event,
                    behavior: None,
                },
            ],
            edges: vec![
                ScriptEdge {
                    from: "event_start".to_string(),
                    to: "event_start".to_string(),
                    label: None,
                },
                ScriptEdge {
                    from: "event_start".to_string(),
                    to: "event_start".to_string(),
                    label: None,
                },
            ],
        };

        let report = graph.validate();
        assert!(report.errors.iter().any(|e| e.code == "empty_node_id"));
        assert!(report.errors.iter().any(|e| e.code == "duplicate_edge"));
    }

    #[test]
    fn behavior_serialization_roundtrips() {
        let node = ScriptNode {
            id: "set_flag_1".to_string(),
            kind: ScriptNodeKind::Action,
            behavior: Some(ScriptNodeBehavior::SetFlag {
                flag: "has_key".to_string(),
                value: true,
                scope: StateScope::Global,
            }),
        };
        let json = serde_json::to_string(&node).expect("serialize");
        let roundtrip: ScriptNode = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(node, roundtrip);
    }

    #[test]
    fn behavior_none_is_backward_compatible() {
        let json = r#"{"id":"old_node","kind":"event"}"#;
        let node: ScriptNode = serde_json::from_str(json).expect("deserialize legacy node");
        assert!(node.behavior.is_none());
    }
}
