/// Generates distinct SVG preview sprites for entities and tiles.
/// These are lightweight placeholder visuals for the editor canvas.
/// When users create actual pixel art (Draw Studio) or import assets,
/// those replace these generated previews.

/// Retro-inspired palette for entity previews (8 distinct colors).
const ENTITY_COLORS: &[[u8; 3]] = &[
    [70, 130, 180],  // steel blue (player-like)
    [178, 80, 80],   // muted red (enemy-like)
    [80, 160, 80],   // forest green (NPC-like)
    [180, 150, 60],  // gold (item-like)
    [140, 90, 160],  // purple (magic-like)
    [180, 120, 70],  // orange-brown (structure)
    [80, 160, 160],  // teal (water/ice)
    [160, 100, 120], // mauve (misc)
];

/// Tile palette — earthy/terrain colors per tile_id.
const TILE_COLORS: &[[u8; 3]] = &[
    [0, 0, 0],       // 0: unused/transparent placeholder
    [90, 148, 80],   // 1: grass green
    [140, 110, 70],  // 2: dirt brown
    [130, 130, 135], // 3: stone gray
    [70, 110, 160],  // 4: water blue
    [160, 140, 90],  // 5: sand
    [60, 80, 60],    // 6: dark grass / forest
    [100, 70, 55],   // 7: wood brown
    [85, 85, 100],   // 8: dark stone
];

/// Generate a 16x16 SVG sprite preview for an entity.
/// Uses a colored silhouette with the first letter of the entity name.
/// Each entity gets a distinct color based on its index.
pub fn generate_entity_svg(index: usize, name: &str) -> String {
    let color = ENTITY_COLORS[index % ENTITY_COLORS.len()];
    let initial = name
        .chars()
        .next()
        .unwrap_or('?')
        .to_uppercase()
        .next()
        .unwrap_or('?');
    let [r, g, b] = color;
    // Darker shade for outline/shadow
    let dr = r.saturating_sub(40);
    let dg = g.saturating_sub(40);
    let db = b.saturating_sub(40);

    format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="rgb({r},{g},{b})" stroke="rgb({dr},{dg},{db})" stroke-width="1"/><text x="8" y="12" text-anchor="middle" font-family="monospace" font-size="10" fill="#fff" font-weight="bold">{initial}</text></svg>"##,
        r = r, g = g, b = b, dr = dr, dg = dg, db = db, initial = initial,
    )
}

/// Generate a 16x16 SVG tile preview for a given tile_id.
/// Each tile_id gets a distinct color with a subtle grid pattern.
pub fn generate_tile_svg(tile_id: u16) -> String {
    let idx = (tile_id as usize) % TILE_COLORS.len();
    let [r, g, b] = TILE_COLORS[idx];
    // Lighter highlight for pattern
    let lr = r.saturating_add(25).min(255);
    let lg = g.saturating_add(25).min(255);
    let lb = b.saturating_add(25).min(255);

    format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">\
<rect width="16" height="16" fill="rgb({r},{g},{b})"/>\
<rect x="0" y="0" width="8" height="8" fill="rgb({lr},{lg},{lb})" opacity="0.3"/>\
<rect x="8" y="8" width="8" height="8" fill="rgb({lr},{lg},{lb})" opacity="0.3"/>\
</svg>"#,
        r = r, g = g, b = b, lr = lr, lg = lg, lb = lb,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn entity_svg_contains_initial() {
        let svg = generate_entity_svg(0, "Player");
        assert!(svg.contains(">P</text>"));
    }

    #[test]
    fn entity_svg_is_valid_svg() {
        let svg = generate_entity_svg(0, "Player");
        assert!(svg.starts_with("<svg"));
        assert!(svg.ends_with("</svg>"));
    }

    #[test]
    fn entity_svg_different_colors_per_index() {
        let svg0 = generate_entity_svg(0, "A");
        let svg1 = generate_entity_svg(1, "A");
        // Same letter but different fill colors
        assert_ne!(svg0, svg1);
    }

    #[test]
    fn entity_svg_wraps_around_palette() {
        let svg0 = generate_entity_svg(0, "A");
        let svg8 = generate_entity_svg(8, "A");
        // Index 8 wraps to index 0
        assert_eq!(svg0, svg8);
    }

    #[test]
    fn entity_svg_handles_empty_name() {
        let svg = generate_entity_svg(0, "");
        assert!(svg.contains(">?</text>"));
    }

    #[test]
    fn tile_svg_is_valid_svg() {
        let svg = generate_tile_svg(1);
        assert!(svg.starts_with("<svg"));
        assert!(svg.ends_with("</svg>"));
    }

    #[test]
    fn tile_svg_different_per_id() {
        let svg1 = generate_tile_svg(1);
        let svg2 = generate_tile_svg(2);
        assert_ne!(svg1, svg2);
    }

    #[test]
    fn tile_svg_wraps_around_palette() {
        let svg1 = generate_tile_svg(1);
        let svg_wrap = generate_tile_svg(1 + TILE_COLORS.len() as u16);
        assert_eq!(svg1, svg_wrap);
    }
}
