/**
 * Shared frontend JSDoc contracts.
 *
 * These typedefs are intentionally lightweight and runtime-free so Phase 1
 * type safety can improve payload correctness before a full TypeScript migration.
 */

/**
 * @typedef {"web" | "desktop_local"} RuntimeMode
 */

/**
 * @typedef {"game_boy" | "nes" | "snes"} AssistedProfile
 */

/**
 * @typedef {{ x: number, y: number }} TilePoint
 */

/**
 * @typedef {{
 *   id: number,
 *   name: string,
 *   position: TilePoint,
 *   components?: Record<string, unknown>,
 *   sprite_preview?: string
 * }} EditorEntity
 */

/**
 * @typedef {{ x: number, y: number, tile_id?: number }} MapTile
 */

/**
 * @typedef {{
 *   active: boolean,
 *   paused: boolean,
 *   speed: number,
 *   frame: number,
 *   trace_enabled?: boolean,
 *   last_tick_delta_ms?: number,
 *   last_tick_steps?: number
 * }} PlaytestState
 */

/**
 * @typedef {{ seq: number, frame: number, kind: string, message: string }} TraceEvent
 */

/**
 * @typedef {{ key: string, value: boolean | number | string }} WatchEntry
 */

/**
 * @typedef {{ key: string, value: boolean }} BreakpointEntry
 */

/**
 * @typedef {{ code: string, message: string, node_id?: string }} ScriptValidationIssue
 */

/**
 * @typedef {{
 *   parseError: string | null,
 *   errors: ScriptValidationIssue[],
 *   lastInput: string
 * }} ScriptValidationState
 */

/**
 * @typedef {{ action: string, message: string } | null} AppErrorState
 */

/**
 * @typedef {{ project_schema_version: number, name: string }} ProjectManifest
 */

/**
 * @typedef {{
 *   output_dir: string,
 *   files: string[],
 *   scene_count: number,
 *   asset_count: number,
 *   profile: string,
 *   mode: string
 * } | null} ExportPreviewReport
 */

/**
 * @typedef {{
 *   warnings: string[],
 *   near_limits: string[],
 *   missing_assets: string[],
 *   trashed_refs: string[]
 * } | null} ProjectHealth
 */

/**
 * @typedef {{
 *   manifest: ProjectManifest,
 *   health: ProjectHealth,
 *   migration_report: unknown
 * }} OpenProjectResponse
 */

/**
 * @typedef {{
 *   manifest: ProjectManifest,
 *   health: ProjectHealth,
 *   backup_created?: boolean
 * }} SaveProjectResponse
 */

/**
 * @typedef {{ health: ProjectHealth }} ProjectHealthResponse
 */

/**
 * @typedef {{ errors: ScriptValidationIssue[] }} ScriptValidationReport
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   spawn_point_count: number,
 *   entity_count: number,
 *   tile_count: number
 * }} SceneDto
 */

/**
 * @typedef {{
 *   scenes: SceneDto[],
 *   active_scene_id: string | null,
 *   active_playtest_scene: string | null,
 *   state: EditorStateResponse
 * }} SceneListResponse
 */

/**
 * @typedef {{
 *   projectDir: string,
 *   projectName: string,
 *   health: ProjectHealth,
 *   migrationReport: unknown,
 *   entities: EditorEntity[],
 *   tiles: MapTile[],
 *   selection: number[],
 *   canUndo: boolean,
 *   canRedo: boolean,
 *   playtestTrace: TraceEvent[],
 *   watchSelectedEntity: EditorEntity | null,
 *   watchFlags: WatchEntry[],
 *   watchVariables: WatchEntry[],
 *   watchInventory: WatchEntry[],
 *   watchSceneFlags: WatchEntry[],
 *   watchSceneVariables: WatchEntry[],
 *   watchSelectedFlags: WatchEntry[],
 *   watchSelectedVariables: WatchEntry[],
 *   watchSelectedInventory: WatchEntry[],
 *   playtestBreakpoints: BreakpointEntry[],
 *   lastBreakpointHit: TraceEvent | null,
 *   playtest: PlaytestState,
 *   diagnostics: {
 *     grid: boolean,
 *     collision: boolean,
 *     ids: boolean,
 *     trace: boolean
 *   },
 *   scriptValidation: ScriptValidationState,
 *   lastError: AppErrorState,
 *   exportPreviewReport: ExportPreviewReport,
 *   runtimeMode: RuntimeMode,
 *   scenes: SceneDto[],
 *   activeSceneId: string | null,
 *   audioBindings: Record<string, string>,
 *   selectedComponents: Record<string, unknown> | null,
 *   cameraX: number,
 *   cameraY: number,
 *   cameraMode: string,
 *   transitionActive: boolean,
 *   transitionOpacity: number,
 *   tilePreviews: Record<number, string>,
 *   spriteRegistry: Record<string, string>
 * }} EditorSnapshot
 */

/**
 * Snake_case runtime payload from backend/project-api.
 * @typedef {{
 *   entities?: EditorEntity[],
 *   tiles?: MapTile[],
 *   selection?: number[],
 *   can_undo?: boolean,
 *   can_redo?: boolean,
 *   playtest?: PlaytestState,
 *   playtest_trace?: TraceEvent[],
 *   watch_selected_entity?: EditorEntity | null,
 *   watch_flags?: WatchEntry[],
 *   watch_variables?: WatchEntry[],
 *   watch_inventory?: WatchEntry[],
 *   watch_scene_flags?: WatchEntry[],
 *   watch_scene_variables?: WatchEntry[],
 *   watch_selected_flags?: WatchEntry[],
 *   watch_selected_variables?: WatchEntry[],
 *   watch_selected_inventory?: WatchEntry[],
 *   playtest_breakpoints?: BreakpointEntry[],
 *   last_breakpoint_hit?: TraceEvent | null,
 *   script_loaded?: boolean,
 *   project_name?: string,
 *   scenes?: SceneDto[],
 *   active_scene_id?: string | null,
 *   active_playtest_scene?: string | null,
 *   audio_bindings?: Record<string, string>,
 *   components?: Record<string, unknown> | null,
 *   camera_x?: number,
 *   camera_y?: number,
 *   camera_mode?: string,
 *   transition_active?: boolean,
 *   transition_opacity?: number,
 *   tile_previews?: Record<number, string>,
 *   sprite_registry?: Record<string, string>
 * }} EditorStateResponse
 */

/**
 * @typedef {{
 *   baseX?: number,
 *   baseY?: number,
 *   mirrorX?: boolean,
 *   points?: TilePoint[]
 * }} AssistedGenerateOptions
 */

/**
 * Command payload contracts (Phase 1)
 * @typedef {{ projectDir: string, applyMigrations: boolean }} OpenProjectPayload
 * @typedef {{ projectDir: string, projectName: string }} SaveProjectPayload
 * @typedef {{ name: string, x: number, y: number, prefabId?: string }} MapCreatePayload
 * @typedef {{ id: number, x: number, y: number }} MapMovePayload
 * @typedef {{ moves: Array<{ id: number, x: number, y: number }> }} MapBatchMovePayload
 * @typedef {{ ids: number[] }} MapSelectPayload
 * @typedef {{ x: number, y: number, tileId: number }} MapPaintTilePayload
 * @typedef {{ points: TilePoint[], tileId: number }} MapPaintTilesPayload
 * @typedef {{ points: TilePoint[] }} MapEraseTilesPayload
 * @typedef {{ x: number, y: number, tileId: number, canvasCols: number, canvasRows: number }} MapFillTilesPayload
 * @typedef {{ speed: number }} PlaytestSpeedPayload
 * @typedef {{ deltaMs: number }} PlaytestTickPayload
 * @typedef {{ enabled: boolean }} PlaytestTracePayload
 * @typedef {{ kinds: string[] }} PlaytestBreakpointsPayload
 * @typedef {{ id: string, name: string }} SceneAddPayload
 * @typedef {{ id: string }} SceneIdPayload
 * @typedef {{ sceneId: string, name: string, x: number, y: number }} SceneAddSpawnPointPayload
 * @typedef {{ entityId: number, components: Record<string, unknown> }} EntitySetComponentsPayload
 * @typedef {{
 *   id?: number,
 *   name?: string,
 *   position?: { x?: number, y?: number },
 *   assetPath?: string
 * }} ExportEditorStateEntityHint
 * @typedef {{
 *   x?: number,
 *   y?: number,
 *   tile_id?: number,
 *   tileId?: number,
 *   assetPath?: string
 * }} ExportEditorStateTileHint
 * @typedef {{
 *   id?: string,
 *   name?: string,
 *   assetPath?: string
 * }} ExportEditorStateAudioHint
 * @typedef {{
 *   event?: string,
 *   audioId?: string
 * }} ExportEditorStateAudioEventHint
 * @typedef {{
 *   entities?: ExportEditorStateEntityHint[],
 *   tiles?: ExportEditorStateTileHint[],
 *   audio?: ExportEditorStateAudioHint[],
 *   audioClips?: ExportEditorStateAudioHint[],
 *   audioBindings?: Record<string, string>,
 *   audioEvents?: ExportEditorStateAudioEventHint[],
 *   playtest?: { frame?: number }
 * }} ExportEditorStateHint
 * @typedef {{
 *   outputDir: string,
 *   projectDir?: string,
 *   profile: string,
 *   debug: boolean,
 *   editorState?: ExportEditorStateHint
 * }} ExportPreviewPayload
 */

export {};
