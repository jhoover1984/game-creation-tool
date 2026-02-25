pub mod animation;
pub mod animation_asset;
pub mod animation_system;
pub mod animator_params;
pub mod camera;
pub mod collision;
pub mod components;
pub mod input;
mod map_editor;
pub mod movement;
pub mod physics;
pub mod prefab;
pub mod scene;
pub mod sprite_preview;
pub mod transition;

use serde::{Deserialize, Serialize};

pub use camera::{update_camera, CameraBounds, CameraMode, CameraState};
pub use collision::{
    check_entity_collisions, check_tile_collisions, entity_aabb, would_collide_with_entities,
    would_collide_with_tiles, Aabb, CollisionPair,
};
pub use animation::{
    tick_animation, AnimationClip, AnimationComponent, AnimationState, AnimationTickOutcome,
    AnimationTransition, LoopMode, TransitionCondition,
};
pub use animation_asset::{
    AnimationClipAsset, AnimationClipAssetId, AnimationClipAssetLibrary, AnimationGraphAsset,
    AnimationGraphAssetLibrary, AssetId,
};
pub use animation_system::{step_animations, step_animations_with_params, AnimationEvent};
pub use animator_params::AnimatorParameters;
pub use components::{CollisionBox, ComponentStore, EntityComponents, SpriteComponent};
pub use input::{InputAction, InputMapping, InputState, KeyCode};
pub use movement::{
    process_movement, FacingDirection, MovementComponent, MovementInput, MovementMode,
    MovementResult,
};
pub use physics::{physics_step, PhysicsConfig, PhysicsStepResult, VelocityComponent};
pub use map_editor::{
    CreateEntityCommand, DeleteEntityCommand, Entity, EntityId, EraseTileCommand, MapEditorState,
    MoveEntityCommand, PaintTileCommand, Position, TileId, TileProperties, TilePropertyRegistry,
};
pub use prefab::{EntityPrefab, PrefabId, PrefabLibrary};
pub use scene::{Scene, SceneCollection, SceneId, SpawnPoint};
pub use sprite_preview::{generate_entity_svg, generate_tile_svg};
pub use transition::{TransitionEffect, TransitionState};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct TickConfig {
    pub ticks_per_second: u32,
}

impl Default for TickConfig {
    fn default() -> Self {
        Self {
            ticks_per_second: 60,
        }
    }
}
