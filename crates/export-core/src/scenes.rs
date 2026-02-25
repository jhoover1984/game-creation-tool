use crate::types::*;

pub(crate) fn default_preview_scenes(profile: ExportProfile) -> Vec<ExportPreviewScene> {
    let (width, height) = profile.viewport();
    let max_tile_x = ((width / 8).saturating_sub(1)) as i32;
    let max_tile_y = ((height / 8).saturating_sub(1)) as i32;
    let prev_tile_x = max_tile_x.saturating_sub(1);
    let prev_tile_y = max_tile_y.saturating_sub(1);
    let edge_entity_x = width.saturating_sub(16);
    let edge_entity_y = height.saturating_sub(16);
    let overflow_entity_x = width.saturating_add(12);
    let overflow_entity_y = height.saturating_add(12);
    let mid_entity_x = width / 2;
    let mid_entity_y = height / 2;
    let quarter_entity_x = width / 4;
    let quarter_entity_y = height / 4;
    let third_entity_x = width / 3;
    let third_entity_y = height / 3;
    vec![
        ExportPreviewScene {
            name: "single_tile_single_entity_frame0".to_string(),
            options: ExportSceneOptions {
                width,
                height,
                tile_px: 8,
            },
            snapshot: ExportSceneSnapshot {
                tiles: vec![ExportTile {
                    x: 0,
                    y: 0,
                    tile_id: 1,
                }],
                entities: vec![ExportEntity {
                    id: 1,
                    name: "Entity 1".to_string(),
                    position: ExportPosition { x: 16, y: 16 },
                }],
                entity_components: std::collections::BTreeMap::new(),
                playtest: ExportPlaytest { frame: 0 },
            },
        },
        ExportPreviewScene {
            name: "single_tile_single_entity_frame20".to_string(),
            options: ExportSceneOptions {
                width,
                height,
                tile_px: 8,
            },
            snapshot: ExportSceneSnapshot {
                tiles: vec![ExportTile {
                    x: 0,
                    y: 0,
                    tile_id: 1,
                }],
                entities: vec![ExportEntity {
                    id: 1,
                    name: "Entity 1".to_string(),
                    position: ExportPosition { x: 16, y: 16 },
                }],
                entity_components: std::collections::BTreeMap::new(),
                playtest: ExportPlaytest { frame: 20 },
            },
        },
        ExportPreviewScene {
            name: "multi_tile_multi_entity_midframe".to_string(),
            options: ExportSceneOptions {
                width,
                height,
                tile_px: 8,
            },
            snapshot: ExportSceneSnapshot {
                tiles: vec![
                    ExportTile {
                        x: 0,
                        y: 0,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 3,
                        y: 2,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 7,
                        y: 5,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 12,
                        y: 10,
                        tile_id: 1,
                    },
                ],
                entities: vec![
                    ExportEntity {
                        id: 1,
                        name: "Entity 1".to_string(),
                        position: ExportPosition { x: 16, y: 16 },
                    },
                    ExportEntity {
                        id: 2,
                        name: "Entity 2".to_string(),
                        position: ExportPosition { x: 80, y: 40 },
                    },
                ],
                entity_components: std::collections::BTreeMap::new(),
                playtest: ExportPlaytest { frame: 14 },
            },
        },
        ExportPreviewScene {
            name: "edge_clamp_entity_positions".to_string(),
            options: ExportSceneOptions {
                width,
                height,
                tile_px: 8,
            },
            snapshot: ExportSceneSnapshot {
                tiles: vec![
                    ExportTile {
                        x: max_tile_x,
                        y: max_tile_y,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: prev_tile_x,
                        y: prev_tile_y,
                        tile_id: 1,
                    },
                ],
                entities: vec![
                    ExportEntity {
                        id: 1,
                        name: "Entity 1".to_string(),
                        position: ExportPosition {
                            x: edge_entity_x as i32,
                            y: edge_entity_y as i32,
                        },
                    },
                    ExportEntity {
                        id: 2,
                        name: "Entity 2".to_string(),
                        position: ExportPosition { x: -10, y: -6 },
                    },
                    ExportEntity {
                        id: 3,
                        name: "Entity 3".to_string(),
                        position: ExportPosition {
                            x: overflow_entity_x as i32,
                            y: overflow_entity_y as i32,
                        },
                    },
                ],
                entity_components: std::collections::BTreeMap::new(),
                playtest: ExportPlaytest { frame: 31 },
            },
        },
        ExportPreviewScene {
            name: "dense_tiles_multi_entity_pathing".to_string(),
            options: ExportSceneOptions {
                width,
                height,
                tile_px: 8,
            },
            snapshot: ExportSceneSnapshot {
                tiles: vec![
                    ExportTile {
                        x: 0,
                        y: 0,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 1,
                        y: 0,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 2,
                        y: 0,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 3,
                        y: 0,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 4,
                        y: 0,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 5,
                        y: 0,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 0,
                        y: 1,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 5,
                        y: 1,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 0,
                        y: 2,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 2,
                        y: 2,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 3,
                        y: 2,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 5,
                        y: 2,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 0,
                        y: 3,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 5,
                        y: 3,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 0,
                        y: 4,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 1,
                        y: 4,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 2,
                        y: 4,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 3,
                        y: 4,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 4,
                        y: 4,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 5,
                        y: 4,
                        tile_id: 1,
                    },
                ],
                entities: vec![
                    ExportEntity {
                        id: 1,
                        name: "Entity 1".to_string(),
                        position: ExportPosition { x: 8, y: 8 },
                    },
                    ExportEntity {
                        id: 2,
                        name: "Entity 2".to_string(),
                        position: ExportPosition { x: 24, y: 16 },
                    },
                    ExportEntity {
                        id: 3,
                        name: "Entity 3".to_string(),
                        position: ExportPosition { x: 40, y: 24 },
                    },
                ],
                entity_components: std::collections::BTreeMap::new(),
                playtest: ExportPlaytest { frame: 45 },
            },
        },
        ExportPreviewScene {
            name: "wide_stride_entities_with_corner_tiles".to_string(),
            options: ExportSceneOptions {
                width,
                height,
                tile_px: 8,
            },
            snapshot: ExportSceneSnapshot {
                tiles: vec![
                    ExportTile {
                        x: 0,
                        y: 0,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 1,
                        y: 0,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 0,
                        y: 1,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: max_tile_x,
                        y: 0,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: prev_tile_x,
                        y: 0,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: max_tile_x,
                        y: 1,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 0,
                        y: max_tile_y,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 1,
                        y: max_tile_y,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 0,
                        y: prev_tile_y,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: max_tile_x,
                        y: max_tile_y,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: prev_tile_x,
                        y: max_tile_y,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: max_tile_x,
                        y: prev_tile_y,
                        tile_id: 1,
                    },
                ],
                entities: vec![
                    ExportEntity {
                        id: 1,
                        name: "Entity 1".to_string(),
                        position: ExportPosition { x: 0, y: 0 },
                    },
                    ExportEntity {
                        id: 2,
                        name: "Entity 2".to_string(),
                        position: ExportPosition { x: 40, y: 40 },
                    },
                    ExportEntity {
                        id: 3,
                        name: "Entity 3".to_string(),
                        position: ExportPosition {
                            x: mid_entity_x as i32,
                            y: mid_entity_y as i32,
                        },
                    },
                    ExportEntity {
                        id: 4,
                        name: "Entity 4".to_string(),
                        position: ExportPosition {
                            x: edge_entity_x as i32,
                            y: edge_entity_y as i32,
                        },
                    },
                ],
                entity_components: std::collections::BTreeMap::new(),
                playtest: ExportPlaytest { frame: 89 },
            },
        },
        ExportPreviewScene {
            name: "profile_bounds_stress_layout".to_string(),
            options: ExportSceneOptions {
                width,
                height,
                tile_px: 8,
            },
            snapshot: ExportSceneSnapshot {
                tiles: vec![
                    ExportTile {
                        x: 0,
                        y: 0,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: max_tile_x,
                        y: 0,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 0,
                        y: max_tile_y,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: max_tile_x,
                        y: max_tile_y,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: prev_tile_x,
                        y: prev_tile_y,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: 2,
                        y: prev_tile_y,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: prev_tile_x,
                        y: 2,
                        tile_id: 1,
                    },
                    ExportTile {
                        x: max_tile_x / 2,
                        y: max_tile_y / 2,
                        tile_id: 1,
                    },
                ],
                entities: vec![
                    ExportEntity {
                        id: 1,
                        name: "Entity 1".to_string(),
                        position: ExportPosition { x: 0, y: 0 },
                    },
                    ExportEntity {
                        id: 2,
                        name: "Entity 2".to_string(),
                        position: ExportPosition {
                            x: quarter_entity_x as i32,
                            y: quarter_entity_y as i32,
                        },
                    },
                    ExportEntity {
                        id: 3,
                        name: "Entity 3".to_string(),
                        position: ExportPosition {
                            x: third_entity_x as i32,
                            y: third_entity_y as i32,
                        },
                    },
                    ExportEntity {
                        id: 4,
                        name: "Entity 4".to_string(),
                        position: ExportPosition {
                            x: edge_entity_x as i32,
                            y: edge_entity_y as i32,
                        },
                    },
                    ExportEntity {
                        id: 5,
                        name: "Entity 5".to_string(),
                        position: ExportPosition {
                            x: overflow_entity_x as i32,
                            y: 0,
                        },
                    },
                ],
                entity_components: std::collections::BTreeMap::new(),
                playtest: ExportPlaytest { frame: 113 },
            },
        },
    ]
}
