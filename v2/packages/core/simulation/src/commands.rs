use gcs_math::Vec2;
use serde::{Deserialize, Serialize};

use crate::project::{Entity, Project};

/// A command that can be applied to the project and undone.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Command {
    SetTile {
        layer_id: String,
        x: u32,
        y: u32,
        new_tile: u32,
        old_tile: u32,
    },
    CreateEntity {
        entity: Entity,
    },
    DeleteEntity {
        entity: Entity,
    },
    MoveEntity {
        entity_id: String,
        old_position: Vec2,
        new_position: Vec2,
    },
}

/// Undo/redo command stack.
#[derive(Debug, Default)]
pub struct CommandStack {
    undo_stack: Vec<Command>,
    redo_stack: Vec<Command>,
}

impl CommandStack {
    pub fn new() -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
        }
    }

    pub fn can_undo(&self) -> bool {
        !self.undo_stack.is_empty()
    }

    pub fn can_redo(&self) -> bool {
        !self.redo_stack.is_empty()
    }

    /// Execute a command on the project and push to undo stack.
    pub fn execute(&mut self, project: &mut Project, cmd: Command) -> bool {
        let ok = apply_command(project, &cmd);
        if ok {
            self.undo_stack.push(cmd);
            self.redo_stack.clear();
        }
        ok
    }

    /// Undo the last command.
    pub fn undo(&mut self, project: &mut Project) -> bool {
        if let Some(cmd) = self.undo_stack.pop() {
            let ok = apply_inverse(project, &cmd);
            if ok {
                self.redo_stack.push(cmd);
            }
            ok
        } else {
            false
        }
    }

    /// Redo the last undone command.
    pub fn redo(&mut self, project: &mut Project) -> bool {
        if let Some(cmd) = self.redo_stack.pop() {
            let ok = apply_command(project, &cmd);
            if ok {
                self.undo_stack.push(cmd);
            }
            ok
        } else {
            false
        }
    }
}

fn apply_command(project: &mut Project, cmd: &Command) -> bool {
    match cmd {
        Command::SetTile {
            layer_id,
            x,
            y,
            new_tile,
            ..
        } => {
            if let Some(layer) = project.tile_layers.iter_mut().find(|l| l.id == *layer_id) {
                layer.set_tile(*x, *y, *new_tile)
            } else {
                false
            }
        }
        Command::CreateEntity { entity } => {
            project.entities.push(entity.clone());
            true
        }
        Command::DeleteEntity { entity } => {
            if let Some(idx) = project.entities.iter().position(|e| e.id == entity.id) {
                project.entities.remove(idx);
                true
            } else {
                false
            }
        }
        Command::MoveEntity {
            entity_id,
            new_position,
            ..
        } => {
            if let Some(ent) = project.entities.iter_mut().find(|e| e.id == *entity_id) {
                ent.position = *new_position;
                true
            } else {
                false
            }
        }
    }
}

fn apply_inverse(project: &mut Project, cmd: &Command) -> bool {
    match cmd {
        Command::SetTile {
            layer_id,
            x,
            y,
            old_tile,
            ..
        } => {
            if let Some(layer) = project.tile_layers.iter_mut().find(|l| l.id == *layer_id) {
                layer.set_tile(*x, *y, *old_tile)
            } else {
                false
            }
        }
        Command::CreateEntity { entity } => {
            // Inverse of create = delete
            if let Some(idx) = project.entities.iter().position(|e| e.id == entity.id) {
                project.entities.remove(idx);
                true
            } else {
                false
            }
        }
        Command::DeleteEntity { entity } => {
            // Inverse of delete = create
            project.entities.push(entity.clone());
            true
        }
        Command::MoveEntity {
            entity_id,
            old_position,
            ..
        } => {
            if let Some(ent) = project.entities.iter_mut().find(|e| e.id == *entity_id) {
                ent.position = *old_position;
                true
            } else {
                false
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_project() -> Project {
        Project::new("Test", 10, 10, 16)
    }

    #[test]
    fn tile_paint_undo_redo() {
        let mut proj = test_project();
        let mut stack = CommandStack::new();

        let cmd = Command::SetTile {
            layer_id: "layer-0".into(),
            x: 3,
            y: 4,
            new_tile: 5,
            old_tile: 0,
        };

        stack.execute(&mut proj, cmd);
        assert_eq!(proj.tile_layers[0].get_tile(3, 4), Some(5));

        stack.undo(&mut proj);
        assert_eq!(proj.tile_layers[0].get_tile(3, 4), Some(0));

        stack.redo(&mut proj);
        assert_eq!(proj.tile_layers[0].get_tile(3, 4), Some(5));
    }

    #[test]
    fn entity_create_delete_undo() {
        let mut proj = test_project();
        let mut stack = CommandStack::new();

        let entity = Entity {
            id: "ent-1".into(),
            name: "NPC".into(),
            position: Vec2::new(32.0, 48.0),
            size: Vec2::new(16.0, 16.0),
            solid: false,
            sprite_id: None,
            animation_clip_id: None,
            tags: vec![],
        };

        stack.execute(&mut proj, Command::CreateEntity {
            entity: entity.clone(),
        });
        assert_eq!(proj.entities.len(), 1);

        stack.undo(&mut proj);
        assert_eq!(proj.entities.len(), 0);

        stack.redo(&mut proj);
        assert_eq!(proj.entities.len(), 1);

        stack.execute(&mut proj, Command::DeleteEntity { entity });
        assert_eq!(proj.entities.len(), 0);

        stack.undo(&mut proj);
        assert_eq!(proj.entities.len(), 1);
    }

    #[test]
    fn entity_move_undo() {
        let mut proj = test_project();
        let mut stack = CommandStack::new();

        let entity = Entity {
            id: "ent-1".into(),
            name: "Player".into(),
            position: Vec2::new(0.0, 0.0),
            size: Vec2::new(16.0, 16.0),
            solid: true,
            sprite_id: None,
            animation_clip_id: None,
            tags: vec![],
        };
        proj.entities.push(entity);

        let cmd = Command::MoveEntity {
            entity_id: "ent-1".into(),
            old_position: Vec2::new(0.0, 0.0),
            new_position: Vec2::new(48.0, 32.0),
        };

        stack.execute(&mut proj, cmd);
        assert_eq!(proj.entities[0].position, Vec2::new(48.0, 32.0));

        stack.undo(&mut proj);
        assert_eq!(proj.entities[0].position, Vec2::new(0.0, 0.0));
    }

    #[test]
    fn redo_cleared_on_new_command() {
        let mut proj = test_project();
        let mut stack = CommandStack::new();

        stack.execute(&mut proj, Command::SetTile {
            layer_id: "layer-0".into(),
            x: 0,
            y: 0,
            new_tile: 1,
            old_tile: 0,
        });
        stack.undo(&mut proj);
        assert!(stack.can_redo());

        // New command clears redo
        stack.execute(&mut proj, Command::SetTile {
            layer_id: "layer-0".into(),
            x: 1,
            y: 1,
            new_tile: 2,
            old_tile: 0,
        });
        assert!(!stack.can_redo());
    }
}
