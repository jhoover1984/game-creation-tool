export const EXPORT_PREVIEW_SCENES = [
  {
    name: "single_tile_single_entity_frame0",
    options: {
      width: 160,
      height: 144,
      tilePx: 8,
    },
    snapshot: {
      tiles: [{ x: 0, y: 0, tile_id: 1 }],
      entities: [{ id: 1, name: "Entity 1", position: { x: 16, y: 16 } }],
      playtest: { frame: 0 },
    },
  },
  {
    name: "single_tile_single_entity_frame20",
    options: {
      width: 160,
      height: 144,
      tilePx: 8,
    },
    snapshot: {
      tiles: [{ x: 0, y: 0, tile_id: 1 }],
      entities: [{ id: 1, name: "Entity 1", position: { x: 16, y: 16 } }],
      playtest: { frame: 20 },
    },
  },
  {
    name: "multi_tile_multi_entity_midframe",
    options: {
      width: 160,
      height: 144,
      tilePx: 8,
    },
    snapshot: {
      tiles: [
        { x: 0, y: 0, tile_id: 1 },
        { x: 3, y: 2, tile_id: 1 },
        { x: 7, y: 5, tile_id: 1 },
        { x: 12, y: 10, tile_id: 1 },
      ],
      entities: [
        { id: 1, name: "Entity 1", position: { x: 16, y: 16 } },
        { id: 2, name: "Entity 2", position: { x: 80, y: 40 } },
      ],
      playtest: { frame: 14 },
    },
  },
  {
    name: "edge_clamp_entity_positions",
    options: {
      width: 160,
      height: 144,
      tilePx: 8,
    },
    snapshot: {
      tiles: [
        { x: 19, y: 17, tile_id: 1 },
        { x: 18, y: 16, tile_id: 1 },
      ],
      entities: [
        { id: 1, name: "Entity 1", position: { x: 158, y: 142 } },
        { id: 2, name: "Entity 2", position: { x: -10, y: -6 } },
      ],
      playtest: { frame: 31 },
    },
  },
];
