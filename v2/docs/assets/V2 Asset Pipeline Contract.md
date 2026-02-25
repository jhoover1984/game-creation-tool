# V2 Asset Pipeline Contract

## Purpose
Define stable flow from imported source assets to runtime-ready artifacts.

## Stages
1. Import: validate type and metadata.
2. Normalize: canonical naming and metadata.
3. Transform: recipe-based processing (optional).
4. Bake: produce runtime artifacts.
5. Publish: register artifacts and dependency graph.

## Key Rules
1. Asset IDs are stable and immutable.
2. Bake outputs are content-hash addressable.
3. Cache invalidation key includes source hash + recipe version + tool version.
4. Import and bake failures must produce actionable diagnostics.

## Animation Assets
1. Clip data includes frame timing and events.
2. Attachment anchors are stored per clip/frame.
3. Generated sheets record source provenance.
