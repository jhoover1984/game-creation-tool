use engine_core::{
    physics_step, process_movement, would_collide_with_entities, would_collide_with_tiles,
    ComponentStore, InputState, MapEditorState, MovementMode, PhysicsConfig, Position,
};

pub(crate) fn process_entity_movement_step(
    map_state: &mut MapEditorState,
    component_store: &mut ComponentStore,
    input_state: &InputState,
) {
    let movement_input = input_state.to_movement_input();
    let entity_ids = component_store.entities_with_movement();
    let tile_size = 8u32;

    for entity_id in entity_ids {
        let entity_pos = match map_state.entities().get(&entity_id) {
            Some(e) => e.position,
            None => continue,
        };

        // Clone the movement component to avoid borrow conflicts.
        let mut movement = match component_store.movement(entity_id) {
            Some(m) => *m,
            None => continue,
        };

        let result = process_movement(entity_pos, &mut movement, movement_input);

        // Check collision before committing position.
        if result.moved {
            let mut blocked = false;

            // Check entity-entity collision if this entity has a collision box.
            if let Some(collision) = component_store.collision(entity_id) {
                let entity_blockers = would_collide_with_entities(
                    entity_id,
                    result.new_position,
                    collision,
                    map_state.entities(),
                    component_store,
                );
                if !entity_blockers.is_empty() {
                    blocked = true;
                }

                // Check tile collision.
                let tile_blockers = would_collide_with_tiles(
                    result.new_position,
                    collision,
                    map_state.tiles(),
                    map_state.tile_properties(),
                    tile_size,
                );
                if !tile_blockers.is_empty() {
                    blocked = true;
                }
            }

            if !blocked {
                // Directly update entity position in map state (bypasses command bus
                // since this is playtest simulation, not editor editing).
                if let Some(entity) = map_state.entities_mut().get_mut(&entity_id) {
                    entity.position = result.new_position;
                }
            }
        }

        // Write back updated movement component (cooldown, facing).
        if let Some(mc) = component_store.movement_mut(entity_id) {
            *mc = movement;
        }
    }
}

pub(crate) fn process_entity_physics_step(
    map_state: &mut MapEditorState,
    component_store: &mut ComponentStore,
    input_state: &InputState,
    physics_config: &PhysicsConfig,
) {
    let entity_ids = component_store.entities_with_velocity();
    let tile_size = 8u32;

    for entity_id in entity_ids {
        let entity_pos = match map_state.entities().get(&entity_id) {
            Some(e) => e.position,
            None => continue,
        };

        let mut velocity = match component_store.velocity(entity_id) {
            Some(v) => *v,
            None => continue,
        };

        // Apply input forces if entity also has a MovementComponent in FreeMove mode.
        if let Some(mc) = component_store.movement(entity_id) {
            if mc.mode == MovementMode::FreeMove {
                let input = input_state.to_movement_input();
                if input.dx != 0 || input.dy != 0 {
                    velocity.apply_force(
                        input.dx as f32 * mc.speed * 0.3,
                        input.dy as f32 * mc.speed * 0.3,
                    );
                }
            }
        }

        let step_result = physics_step(&mut velocity, physics_config);

        if step_result.dx != 0 || step_result.dy != 0 {
            let new_pos = Position {
                x: entity_pos.x + step_result.dx,
                y: entity_pos.y + step_result.dy,
            };

            let mut blocked = false;
            if let Some(collision) = component_store.collision(entity_id) {
                if !would_collide_with_entities(
                    entity_id,
                    new_pos,
                    collision,
                    map_state.entities(),
                    component_store,
                )
                .is_empty()
                {
                    blocked = true;
                }

                if !would_collide_with_tiles(
                    new_pos,
                    collision,
                    map_state.tiles(),
                    map_state.tile_properties(),
                    tile_size,
                )
                .is_empty()
                {
                    blocked = true;
                    // Zero velocity on tile collision (e.g. landing).
                    if step_result.dy != 0 {
                        velocity.vy = 0.0;
                    }
                    if step_result.dx != 0 {
                        velocity.vx = 0.0;
                    }
                }
            }

            if !blocked {
                if let Some(entity) = map_state.entities_mut().get_mut(&entity_id) {
                    entity.position = new_pos;
                }
            }
        }

        // Write back updated velocity.
        if let Some(vc) = component_store.velocity_mut(entity_id) {
            *vc = velocity;
        }
    }
}
