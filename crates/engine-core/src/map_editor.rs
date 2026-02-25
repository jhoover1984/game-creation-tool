use std::collections::HashMap;

use command_core::{Command, CommandError};
use serde::{Deserialize, Serialize};

pub type EntityId = u64;
pub type TileId = u16;

/// Properties for a tile type. All tiles default to solid (retro convention: placed tiles = walls).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct TileProperties {
    pub solid: bool,
}

impl Default for TileProperties {
    fn default() -> Self {
        Self { solid: true }
    }
}

/// Registry mapping tile IDs to their properties.
/// Tiles not in the registry use `TileProperties::default()` (solid).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TilePropertyRegistry {
    overrides: HashMap<TileId, TileProperties>,
}

impl TilePropertyRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn set(&mut self, tile_id: TileId, props: TileProperties) {
        self.overrides.insert(tile_id, props);
    }

    pub fn get(&self, tile_id: TileId) -> TileProperties {
        self.overrides
            .get(&tile_id)
            .copied()
            .unwrap_or_default()
    }

    pub fn is_solid(&self, tile_id: TileId) -> bool {
        self.get(tile_id).solid
    }

    pub fn remove(&mut self, tile_id: TileId) {
        self.overrides.remove(&tile_id);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Position {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Entity {
    pub id: EntityId,
    pub name: String,
    pub position: Position,
}

#[derive(Debug, Default)]
pub struct MapEditorState {
    entities: HashMap<EntityId, Entity>,
    tiles: HashMap<(i32, i32), TileId>,
    tile_properties: TilePropertyRegistry,
    next_entity_id: EntityId,
}

impl MapEditorState {
    pub fn entities(&self) -> &HashMap<EntityId, Entity> {
        &self.entities
    }

    pub fn entities_mut(&mut self) -> &mut HashMap<EntityId, Entity> {
        &mut self.entities
    }

    pub fn tiles(&self) -> &HashMap<(i32, i32), TileId> {
        &self.tiles
    }

    pub fn tile_properties(&self) -> &TilePropertyRegistry {
        &self.tile_properties
    }

    pub fn tile_properties_mut(&mut self) -> &mut TilePropertyRegistry {
        &mut self.tile_properties
    }

    fn allocate_id(&mut self) -> Result<EntityId, CommandError> {
        self.next_entity_id = self
            .next_entity_id
            .checked_add(1)
            .ok_or_else(|| CommandError::Failed("entity id overflow".to_string()))?;
        Ok(self.next_entity_id)
    }

    fn insert_entity(&mut self, entity: Entity) {
        self.next_entity_id = self.next_entity_id.max(entity.id);
        self.entities.insert(entity.id, entity);
    }
}

pub struct PaintTileCommand {
    x: i32,
    y: i32,
    tile_id: TileId,
    previous: Option<Option<TileId>>,
}

impl PaintTileCommand {
    pub fn new(x: i32, y: i32, tile_id: TileId) -> Self {
        Self {
            x,
            y,
            tile_id,
            previous: None,
        }
    }
}

impl Command<MapEditorState> for PaintTileCommand {
    fn label(&self) -> &str {
        "paint_tile"
    }

    fn execute(&mut self, state: &mut MapEditorState) -> Result<(), CommandError> {
        if self.previous.is_none() {
            self.previous = Some(state.tiles.get(&(self.x, self.y)).copied());
        }
        state.tiles.insert((self.x, self.y), self.tile_id);
        Ok(())
    }

    fn undo(&mut self, state: &mut MapEditorState) -> Result<(), CommandError> {
        let previous = self
            .previous
            .ok_or_else(|| CommandError::Failed("cannot undo paint before execute".to_string()))?;
        match previous {
            Some(tile_id) => {
                state.tiles.insert((self.x, self.y), tile_id);
            }
            None => {
                state.tiles.remove(&(self.x, self.y));
            }
        }
        Ok(())
    }
}

pub struct EraseTileCommand {
    x: i32,
    y: i32,
    removed: Option<Option<TileId>>,
}

impl EraseTileCommand {
    pub fn new(x: i32, y: i32) -> Self {
        Self {
            x,
            y,
            removed: None,
        }
    }
}

impl Command<MapEditorState> for EraseTileCommand {
    fn label(&self) -> &str {
        "erase_tile"
    }

    fn execute(&mut self, state: &mut MapEditorState) -> Result<(), CommandError> {
        if self.removed.is_none() {
            self.removed = Some(state.tiles.remove(&(self.x, self.y)));
            return Ok(());
        }
        state.tiles.remove(&(self.x, self.y));
        Ok(())
    }

    fn undo(&mut self, state: &mut MapEditorState) -> Result<(), CommandError> {
        let previous = self
            .removed
            .ok_or_else(|| CommandError::Failed("cannot undo erase before execute".to_string()))?;
        if let Some(tile_id) = previous {
            state.tiles.insert((self.x, self.y), tile_id);
        }
        Ok(())
    }
}

pub struct CreateEntityCommand {
    name: String,
    position: Position,
    created_entity: Option<Entity>,
}

impl CreateEntityCommand {
    pub fn new(name: impl Into<String>, position: Position) -> Self {
        Self {
            name: name.into(),
            position,
            created_entity: None,
        }
    }
}

impl Command<MapEditorState> for CreateEntityCommand {
    fn label(&self) -> &str {
        "create_entity"
    }

    fn execute(&mut self, state: &mut MapEditorState) -> Result<(), CommandError> {
        let entity = if let Some(existing) = self.created_entity.clone() {
            existing
        } else {
            Entity {
                id: state.allocate_id()?,
                name: self.name.clone(),
                position: self.position,
            }
        };
        self.created_entity = Some(entity.clone());
        state.insert_entity(entity);
        Ok(())
    }

    fn undo(&mut self, state: &mut MapEditorState) -> Result<(), CommandError> {
        let Some(entity) = &self.created_entity else {
            return Err(CommandError::Failed(
                "cannot undo create before execute".to_string(),
            ));
        };
        state.entities.remove(&entity.id);
        Ok(())
    }
}

pub struct MoveEntityCommand {
    entity_id: EntityId,
    to: Position,
    from: Option<Position>,
}

impl MoveEntityCommand {
    pub fn new(entity_id: EntityId, to: Position) -> Self {
        Self {
            entity_id,
            to,
            from: None,
        }
    }
}

impl Command<MapEditorState> for MoveEntityCommand {
    fn label(&self) -> &str {
        "move_entity"
    }

    fn execute(&mut self, state: &mut MapEditorState) -> Result<(), CommandError> {
        let entity = state.entities.get_mut(&self.entity_id).ok_or_else(|| {
            CommandError::Failed(format!("entity {} was not found", self.entity_id))
        })?;

        if self.from.is_none() {
            self.from = Some(entity.position);
        }
        entity.position = self.to;
        Ok(())
    }

    fn undo(&mut self, state: &mut MapEditorState) -> Result<(), CommandError> {
        let entity = state.entities.get_mut(&self.entity_id).ok_or_else(|| {
            CommandError::Failed(format!("entity {} was not found", self.entity_id))
        })?;
        let from = self
            .from
            .ok_or_else(|| CommandError::Failed("cannot undo move before execute".to_string()))?;
        entity.position = from;
        Ok(())
    }
}

pub struct DeleteEntityCommand {
    entity_id: EntityId,
    deleted_entity: Option<Entity>,
}

impl DeleteEntityCommand {
    pub fn new(entity_id: EntityId) -> Self {
        Self {
            entity_id,
            deleted_entity: None,
        }
    }
}

impl Command<MapEditorState> for DeleteEntityCommand {
    fn label(&self) -> &str {
        "delete_entity"
    }

    fn execute(&mut self, state: &mut MapEditorState) -> Result<(), CommandError> {
        let deleted = state.entities.remove(&self.entity_id).ok_or_else(|| {
            CommandError::Failed(format!("entity {} was not found", self.entity_id))
        })?;
        self.deleted_entity = Some(deleted);
        Ok(())
    }

    fn undo(&mut self, state: &mut MapEditorState) -> Result<(), CommandError> {
        let entity = self
            .deleted_entity
            .clone()
            .ok_or_else(|| CommandError::Failed("cannot undo delete before execute".to_string()))?;
        state.insert_entity(entity);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use command_core::{BatchCommand, CommandStack};

    use super::*;

    #[test]
    fn create_entity_command_supports_undo_redo() {
        let mut state = MapEditorState::default();
        let mut stack = CommandStack::default();

        stack
            .execute(
                &mut state,
                Box::new(CreateEntityCommand::new("Player", Position { x: 2, y: 4 })),
            )
            .expect("create");
        assert_eq!(state.entities().len(), 1);

        stack.undo(&mut state).expect("undo create");
        assert!(state.entities().is_empty());

        stack.redo(&mut state).expect("redo create");
        assert_eq!(state.entities().len(), 1);
    }

    #[test]
    fn move_entity_command_supports_undo_redo() {
        let mut state = MapEditorState::default();
        let mut setup = CreateEntityCommand::new("NPC", Position { x: 1, y: 1 });
        setup.execute(&mut state).expect("setup entity");
        let entity_id = state
            .entities()
            .keys()
            .next()
            .copied()
            .expect("entity id present");

        let mut stack = CommandStack::default();
        stack
            .execute(
                &mut state,
                Box::new(MoveEntityCommand::new(entity_id, Position { x: 8, y: 9 })),
            )
            .expect("move");

        assert_eq!(
            state.entities()[&entity_id].position,
            Position { x: 8, y: 9 }
        );
        stack.undo(&mut state).expect("undo move");
        assert_eq!(
            state.entities()[&entity_id].position,
            Position { x: 1, y: 1 }
        );
    }

    #[test]
    fn batch_move_is_single_undo_entry() {
        let mut state = MapEditorState::default();
        CreateEntityCommand::new("A", Position { x: 0, y: 0 })
            .execute(&mut state)
            .expect("create A");
        CreateEntityCommand::new("B", Position { x: 10, y: 10 })
            .execute(&mut state)
            .expect("create B");
        let id_a = state
            .entities()
            .iter()
            .find(|(_, entity)| entity.name == "A")
            .map(|(id, _)| *id)
            .expect("id for A");
        let id_b = state
            .entities()
            .iter()
            .find(|(_, entity)| entity.name == "B")
            .map(|(id, _)| *id)
            .expect("id for B");

        let mut batch = BatchCommand::new("batch_move");
        batch.push(Box::new(MoveEntityCommand::new(
            id_a,
            Position { x: 1, y: 1 },
        )));
        batch.push(Box::new(MoveEntityCommand::new(
            id_b,
            Position { x: 11, y: 11 },
        )));

        let mut stack = CommandStack::default();
        stack
            .execute(&mut state, Box::new(batch))
            .expect("execute batch");
        assert_eq!(stack.undo_len(), 1);
        assert_eq!(state.entities()[&id_a].position, Position { x: 1, y: 1 });
        assert_eq!(state.entities()[&id_b].position, Position { x: 11, y: 11 });

        stack.undo(&mut state).expect("undo batch");
        assert_eq!(state.entities()[&id_a].position, Position { x: 0, y: 0 });
        assert_eq!(state.entities()[&id_b].position, Position { x: 10, y: 10 });
    }

    #[test]
    fn delete_entity_command_supports_undo_redo() {
        let mut state = MapEditorState::default();
        CreateEntityCommand::new("DeleteMe", Position { x: 3, y: 6 })
            .execute(&mut state)
            .expect("create");
        let id = *state.entities().keys().next().expect("entity id");

        let mut stack = CommandStack::default();
        stack
            .execute(&mut state, Box::new(DeleteEntityCommand::new(id)))
            .expect("delete");
        assert!(state.entities().is_empty());

        stack.undo(&mut state).expect("undo delete");
        assert_eq!(state.entities().len(), 1);
        assert_eq!(state.entities()[&id].position, Position { x: 3, y: 6 });

        stack.redo(&mut state).expect("redo delete");
        assert!(state.entities().is_empty());
    }

    #[test]
    fn paint_and_erase_tile_commands_support_undo_redo() {
        let mut state = MapEditorState::default();
        let mut stack = CommandStack::default();
        stack
            .execute(&mut state, Box::new(PaintTileCommand::new(2, 3, 1)))
            .expect("paint");
        assert_eq!(state.tiles().get(&(2, 3)), Some(&1));

        stack
            .execute(&mut state, Box::new(EraseTileCommand::new(2, 3)))
            .expect("erase");
        assert!(!state.tiles().contains_key(&(2, 3)));

        stack.undo(&mut state).expect("undo erase");
        assert_eq!(state.tiles().get(&(2, 3)), Some(&1));

        stack.undo(&mut state).expect("undo paint");
        assert!(!state.tiles().contains_key(&(2, 3)));
    }

    #[test]
    fn tile_properties_default_solid() {
        let registry = TilePropertyRegistry::new();
        assert!(registry.is_solid(1));
        assert!(registry.is_solid(42));
        assert_eq!(registry.get(1), TileProperties::default());
    }

    #[test]
    fn tile_properties_override() {
        let mut registry = TilePropertyRegistry::new();
        registry.set(2, TileProperties { solid: false });
        assert!(!registry.is_solid(2));
        assert!(registry.is_solid(1)); // unset tiles still solid

        registry.remove(2);
        assert!(registry.is_solid(2)); // reverts to default
    }

    #[test]
    fn map_editor_state_has_tile_properties() {
        let mut state = MapEditorState::default();
        state
            .tile_properties_mut()
            .set(5, TileProperties { solid: false });
        assert!(!state.tile_properties().is_solid(5));
        assert!(state.tile_properties().is_solid(1));
    }

    #[test]
    #[allow(clippy::field_reassign_with_default)]
    fn create_entity_reports_overflow_instead_of_saturating() {
        let mut state = MapEditorState::default();
        state.next_entity_id = u64::MAX;
        let mut command = CreateEntityCommand::new("Overflow", Position { x: 0, y: 0 });
        let result = command.execute(&mut state);
        assert!(result.is_err(), "expected overflow to return an error");
        assert_eq!(state.entities().len(), 0);
    }
}
