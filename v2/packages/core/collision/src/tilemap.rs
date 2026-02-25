use gcs_math::rect::Aabb;

/// Collect solid tile AABBs from a tile layer near a given region.
/// `solid_fn` returns true if a tile ID is solid.
pub fn collect_solid_tiles(
    layer_data: &[u32],
    layer_width: u32,
    layer_height: u32,
    tile_size: f32,
    region: &Aabb,
    solid_fn: impl Fn(u32) -> bool,
) -> Vec<Aabb> {
    // Convert region to grid bounds (with 1-tile margin)
    let gx_min = ((region.min.x / tile_size).floor() as i32 - 1).max(0) as u32;
    let gy_min = ((region.min.y / tile_size).floor() as i32 - 1).max(0) as u32;
    let gx_max = ((region.max.x / tile_size).ceil() as u32 + 1).min(layer_width);
    let gy_max = ((region.max.y / tile_size).ceil() as u32 + 1).min(layer_height);

    let mut solids = Vec::new();
    for gy in gy_min..gy_max {
        for gx in gx_min..gx_max {
            let tile_id = layer_data[(gy * layer_width + gx) as usize];
            if tile_id > 0 && solid_fn(tile_id) {
                solids.push(Aabb::new(
                    gx as f32 * tile_size,
                    gy as f32 * tile_size,
                    tile_size,
                    tile_size,
                ));
            }
        }
    }
    solids
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn collects_solid_tiles_near_region() {
        // 4x4 grid, tile_size=16
        #[rustfmt::skip]
        let data = vec![
            0, 0, 0, 0,
            0, 1, 1, 0,
            0, 1, 0, 0,
            0, 0, 0, 0,
        ];

        let region = Aabb::new(8.0, 8.0, 32.0, 32.0);
        let solids = collect_solid_tiles(&data, 4, 4, 16.0, &region, |id| id > 0);

        assert_eq!(solids.len(), 3);
    }

    #[test]
    fn empty_layer_no_solids() {
        let data = vec![0; 16];
        let region = Aabb::new(0.0, 0.0, 64.0, 64.0);
        let solids = collect_solid_tiles(&data, 4, 4, 16.0, &region, |id| id > 0);
        assert!(solids.is_empty());
    }
}
