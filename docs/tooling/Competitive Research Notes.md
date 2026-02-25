# Competitive Research Notes (Tile, Audio, Scripting)

Last updated: 2026-02-15
Purpose: summarize external patterns we should copy, then define differentiated bets for Game Creator Studio.

## What Established Tools Do Well
0. Project launch and onboarding:
- Unreal starts with project/template creation and encourages template-driven starts.
- Unity Hub foregrounds template categories and creation path before entering editor.
- Godot opens in Project Manager by default (create/import/run/recovery-friendly entry).
- GameMaker and RPG Maker reduce first-run friction with explicit Start/New/Open flows and sample content.

1. Tile mapping:
- Unity Tilemap + palette workflows are approachable for 2D iteration.
- Tiled provides strong automapping and terrain-rule authoring.
- LDtk emphasizes data-rich levels with auto-layers and entity metadata.

2. Scripting and gameplay logic:
- Unreal and Unity both provide visual scripting pathways for non-programmers.
- GDevelop is strongly beginner-first with event-sheet style logic.
- Godot supports multiple scripting options while keeping tight engine integration.

3. Audio/music:
- Godot documents practical bus/effect routing for in-engine audio authoring.
- Wwise and FMOD focus on adaptive music/state transitions at runtime.

## GCS Direction (Recommended)
0. Dashboard-first entry:
- Launch into a dedicated dashboard with `New/Open/Recent/Recover` before the editor shell.
- Keep a beginner default path that produces a playable project fast.
- Use templates + guided walkthrough cards to reduce blank-canvas anxiety.

1. Beginner path first:
- Event Graph should be the default logic tool.
- Rhai scripting should be opt-in, attached to graph nodes as an advanced escape hatch.

2. Authoring-time intelligence:
- Constraint checks should run during tile paint/audio setup, not only at export.
- Issues Drawer should propose one-click remediations tied to specific rule failures.

3. Differentiators worth building:
- Intent-based tile painting (user paints "what they mean", rule packs resolve final tile edges/variants).
- Explain-this-bug diagnostics (trace + state diff -> plain-English likely causes + suggested fixes).
- Profile-aware adaptive audio planner (music state graph with profile-safe warnings).

## Implementation Notes
1. Keep v1 lightweight:
- Avoid heavyweight DAW/video stacks in core path.
- Ship core audio mixer + state transitions first, tracker/sequencer later.

2. Keep determinism:
- Script/runtime logic must produce the same results in playtest and export.
- Add golden logic fixtures for script graph parity in CI.

3. Keep extensibility:
- Rule packs (tile/audio/script actions) should be data-driven and versioned.

## References
- Unreal projects/templates: https://dev.epicgames.com/documentation/en-us/unreal-engine/working-with-projects-and-templates-in-unreal-engine
- Unity Hub templates: https://docs.unity3d.com/hub/manual/Templates.html
- Godot project manager: https://docs.godotengine.org/en/latest/tutorials/editor/project_manager.html
- GameMaker Start Page: https://manual.gamemaker.io/monthly/en/Introduction/The_Start_Page.htm
- RPG Maker MZ new project flow: https://rpgmakerofficial.com/product/MZ_help-en/01_02.html
- Unity Tilemap: https://docs.unity3d.com/cn/2023.2/Manual/Tilemap.html
- Unity Visual Scripting: https://docs.unity.cn/6000.2/Documentation/Manual/com.unity.visualscripting.html
- Unreal Blueprints: https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-blueprints-visual-scripting-in-unreal-engine
- Tiled Automapping: https://doc.mapeditor.org/en/stable/manual/automapping/
- Tiled Terrains: https://doc.mapeditor.org/en/stable/manual/terrain/
- LDtk auto-layers: https://ldtk.io/docs/general/auto-layers/
- Godot scripting languages: https://docs.godotengine.org/en/4.4/getting_started/step_by_step/scripting_languages.html
- Godot audio buses: https://docs.godotengine.org/en/latest/tutorials/audio/audio_buses.html
- GDevelop docs: https://wiki.gdevelop.io/
- Rhai (Rust embedded scripting): https://github.com/rhaiscript/rhai
- Wwise SDK docs index: https://www.audiokinetic.com/library/edge/?id=index.html&source=SDK
- FMOD docs: https://www.fmod.com/docs/2.02/studio/api.html
