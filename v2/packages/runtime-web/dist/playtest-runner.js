import { BehaviorEvaluator } from './behavior-evaluator.js';
import { resolveTargetEntityIds } from './behavior-targeting.js';
/**
 * PlaytestRunner -- TS mirror of Rust PlaytestWorld.
 * Runs the simulation loop: input -> movement -> collision -> physics.
 * Will be replaced by WASM bridge once wasm-pack is wired.
 */
export class PlaytestRunner {
    proximityRadius = 24;
    status = 'stopped';
    tick = 0;
    entities = [];
    tileLayer = null;
    tileSize = 16;
    physics = { gravityX: 0, gravityY: 0, fixedDt: 1 / 60 };
    input = { moveX: 0, moveY: 0, interact: false };
    lastInteractPressed = false;
    staleGuardMax = 60 * 60 * 5;
    behaviors = {};
    evaluator = new BehaviorEvaluator();
    lastStepOverflow = { rowCapHit: false, actionCapHits: [] };
    /** Initialize from project state. */
    init(entities, tileLayers, tileSize) {
        this.tileSize = tileSize;
        this.tileLayer = tileLayers[0] ?? null;
        this.entities = entities.map((e) => ({
            id: e.id,
            name: e.name,
            x: e.position.x,
            y: e.position.y,
            w: e.size.w,
            h: e.size.h,
            solid: e.solid,
            vx: 0,
            vy: 0,
            gravityScale: 1,
            friction: 0,
            movementMode: 'free',
            speed: e.speed ?? 120,
            isPlayer: e.tags.includes('player'),
            tags: [...e.tags],
        }));
        this.lastInteractPressed = false;
    }
    enter() {
        if (this.status !== 'stopped')
            return false;
        this.status = 'running';
        this.tick = 0;
        return true;
    }
    exit() {
        this.status = 'stopped';
        this.tick = 0;
        this.evaluator.clearTrace();
        this.lastStepOverflow = { rowCapHit: false, actionCapHits: [] };
    }
    getLastStepOverflow() {
        return this.lastStepOverflow;
    }
    setBehaviors(behaviors) {
        this.behaviors = behaviors;
    }
    getTrace() {
        return this.evaluator.getTrace();
    }
    clearTrace() {
        this.evaluator.clearTrace();
    }
    pause() {
        if (this.status !== 'running')
            return false;
        this.status = 'paused';
        return true;
    }
    resume() {
        if (this.status !== 'paused')
            return false;
        this.status = 'running';
        return true;
    }
    setInput(input) {
        this.input = input;
    }
    setGravity(x, y) {
        this.physics.gravityX = x;
        this.physics.gravityY = y;
    }
    getStatus() {
        return this.status;
    }
    /** Run one simulation tick. Returns the world snapshot. */
    step() {
        if (this.status !== 'running')
            return null;
        this.tick++;
        if (this.tick >= this.staleGuardMax) {
            this.status = 'stopped';
            return null;
        }
        const dt = this.physics.fixedDt;
        const collisionEntityIds = new Set();
        // Collect solid tile AABBs
        const solidTiles = this.collectSolidTiles();
        for (const ent of this.entities) {
            let dx = 0;
            let dy = 0;
            if (ent.isPlayer) {
                // Player movement from input
                const mx = this.input.moveX;
                const my = this.input.moveY;
                if (typeof ent.movementMode === 'object' && 'grid' in ent.movementMode) {
                    // Grid mode
                    if (mx !== 0 || my !== 0) {
                        if (Math.abs(mx) >= Math.abs(my)) {
                            dx = Math.sign(mx) * ent.movementMode.grid;
                        }
                        else {
                            dy = Math.sign(my) * ent.movementMode.grid;
                        }
                    }
                }
                else {
                    // Free mode
                    const len = Math.sqrt(mx * mx + my * my);
                    if (len > 0) {
                        dx = (mx / len) * ent.speed * dt;
                        dy = (my / len) * ent.speed * dt;
                    }
                }
            }
            else {
                // Non-player: physics
                ent.vx += this.physics.gravityX * ent.gravityScale * dt;
                ent.vy += this.physics.gravityY * ent.gravityScale * dt;
                if (ent.friction > 0) {
                    const damping = Math.max(0, 1 - ent.friction * dt);
                    ent.vx *= damping;
                    ent.vy *= damping;
                }
                dx = ent.vx * dt;
                dy = ent.vy * dt;
            }
            if (dx === 0 && dy === 0)
                continue;
            // Collect all solid AABBs (tiles + other solid entities)
            const solids = [...solidTiles];
            for (const other of this.entities) {
                if (other !== ent && other.solid) {
                    solids.push({ x: other.x, y: other.y, w: other.w, h: other.h });
                }
            }
            // Resolve collision (axis-separated slide)
            const resolved = this.resolveMove(ent, dx, dy, solids);
            ent.x = resolved.x;
            ent.y = resolved.y;
            if (resolved.blockedX)
                ent.vx = 0;
            if (resolved.blockedY)
                ent.vy = 0;
            if (resolved.blockedX || resolved.blockedY) {
                collisionEntityIds.add(ent.id);
            }
        }
        const interactions = this.collectInteractionsForStep();
        // Evaluate traces first from one post-physics snapshot.
        const edDefs = this.toEntityDefs();
        const tickEntries = this.evaluator.evaluate(this.behaviors, edDefs, 'on:tick');
        const tickOv = this.evaluator.getLastOverflow();
        const interactEntityIds = new Set();
        for (let i = 0; i < interactions.length; i += 1) {
            interactEntityIds.add(interactions[i].actorId);
            interactEntityIds.add(interactions[i].targetId);
        }
        const interactEntries = interactEntityIds.size > 0
            ? this.evaluator.evaluate(this.behaviors, edDefs, 'on:interact', interactEntityIds)
            : [];
        const interactOv = interactEntityIds.size > 0
            ? this.evaluator.getLastOverflow()
            : { rowCapHit: false, actionCapHits: [] };
        const collisionEntries = collisionEntityIds.size > 0
            ? this.evaluator.evaluate(this.behaviors, edDefs, 'on:collision', collisionEntityIds)
            : [];
        const collisionOv = collisionEntityIds.size > 0
            ? this.evaluator.getLastOverflow()
            : { rowCapHit: false, actionCapHits: [] };
        const proximityEntityIds = this.collectProximityEntityIds(edDefs, this.proximityRadius);
        const proximityEntries = proximityEntityIds.size > 0
            ? this.evaluator.evaluate(this.behaviors, edDefs, 'on:proximity', proximityEntityIds)
            : [];
        const proximityOv = proximityEntityIds.size > 0
            ? this.evaluator.getLastOverflow()
            : { rowCapHit: false, actionCapHits: [] };
        // Execute deterministic actions from trace metadata.
        this.applyDispatchedActionsFromTrace(tickEntries);
        this.applyDispatchedActionsFromTrace(interactEntries);
        this.applyDispatchedActionsFromTrace(collisionEntries);
        this.applyDispatchedActionsFromTrace(proximityEntries);
        // Merge per-evaluate overflows into a single step-level report (deduped).
        this.lastStepOverflow = this.mergeOverflows([tickOv, interactOv, collisionOv, proximityOv]);
        return this.snapshot(interactions);
    }
    snapshot(interactions = []) {
        return {
            tick: this.tick,
            state: this.status,
            entities: this.entities.map((e) => ({
                id: e.id,
                name: e.name,
                x: e.x,
                y: e.y,
                w: e.w,
                h: e.h,
            })),
            interactions,
        };
    }
    collectInteractionsForStep() {
        const interactPressed = this.input.interact === true;
        const justPressed = interactPressed && !this.lastInteractPressed;
        this.lastInteractPressed = interactPressed;
        if (!justPressed)
            return [];
        const player = this.entities.find((e) => e.isPlayer);
        if (!player)
            return [];
        const target = this.findInteractableNearPlayer(player);
        if (!target)
            return [];
        return [{ actorId: player.id, targetId: target.id, type: 'interact' }];
    }
    findInteractableNearPlayer(player) {
        const range = 4;
        const px = player.x - range;
        const py = player.y - range;
        const pw = player.w + range * 2;
        const ph = player.h + range * 2;
        for (const ent of this.entities) {
            if (ent.id === player.id)
                continue;
            const isInteractable = ent.tags.includes('interactable') || ent.tags.includes('npc');
            if (!isInteractable)
                continue;
            const overlaps = px < ent.x + ent.w && px + pw > ent.x && py < ent.y + ent.h && py + ph > ent.y;
            if (overlaps)
                return ent;
        }
        return null;
    }
    collectSolidTiles() {
        if (!this.tileLayer)
            return [];
        const { data, width, height } = this.tileLayer;
        const ts = this.tileSize;
        const solids = [];
        for (let gy = 0; gy < height; gy++) {
            for (let gx = 0; gx < width; gx++) {
                if (data[gy * width + gx] > 0) {
                    solids.push({ x: gx * ts, y: gy * ts, w: ts, h: ts });
                }
            }
        }
        return solids;
    }
    toEntityDefs() {
        return this.entities.map((e) => ({
            id: e.id,
            name: e.name,
            position: { x: e.x, y: e.y },
            size: { w: e.w, h: e.h },
            solid: e.solid,
            tags: [...e.tags],
        }));
    }
    applyDispatchedActionsFromTrace(entries) {
        const destroyIds = new Set();
        const targetSnapshot = this.toEntityDefs();
        for (let i = 0; i < entries.length; i += 1) {
            const entry = entries[i];
            const rows = this.behaviors[entry.entityId] ?? [];
            const row = rows.find((r) => r.id === entry.rowId);
            if (!row)
                continue;
            for (let j = 0; j < entry.actionResults.length; j += 1) {
                const result = entry.actionResults[j];
                if (!result.dispatched)
                    continue;
                const action = row.actions.find((a) => a.id === result.id);
                if (!action)
                    continue;
                const targetIds = resolveTargetEntityIds(targetSnapshot, entry.entityId, action.target);
                if (action.type === 'set_velocity') {
                    const vx = action.params['vx'];
                    const vy = action.params['vy'];
                    if (typeof vx === 'number' && Number.isFinite(vx) && typeof vy === 'number' && Number.isFinite(vy)) {
                        for (let k = 0; k < targetIds.length; k += 1) {
                            const ent = this.entities.find((e) => e.id === targetIds[k]);
                            if (!ent)
                                continue;
                            ent.vx = vx;
                            ent.vy = vy;
                        }
                    }
                }
                else if (action.type === 'destroy_self') {
                    for (let k = 0; k < targetIds.length; k += 1) {
                        destroyIds.add(targetIds[k]);
                    }
                }
            }
        }
        if (destroyIds.size > 0) {
            this.entities = this.entities.filter((e) => !destroyIds.has(e.id));
        }
    }
    mergeOverflows(overflows) {
        let rowCapHit = false;
        const seen = new Set();
        const actionCapHits = [];
        for (const ov of overflows) {
            if (ov.rowCapHit)
                rowCapHit = true;
            for (const hit of ov.actionCapHits) {
                const key = `${hit.entityId}:${hit.rowId}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    actionCapHits.push(hit);
                }
            }
        }
        return { rowCapHit, actionCapHits };
    }
    resolveMove(ent, dx, dy, solids) {
        const overlaps = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
        // Try full move
        const fullX = ent.x + dx;
        const fullY = ent.y + dy;
        if (!solids.some((s) => overlaps(fullX, fullY, ent.w, ent.h, s.x, s.y, s.w, s.h))) {
            return { x: fullX, y: fullY, blockedX: false, blockedY: false };
        }
        // Try X-only
        const canX = !solids.some((s) => overlaps(ent.x + dx, ent.y, ent.w, ent.h, s.x, s.y, s.w, s.h));
        // Try Y-only
        const canY = !solids.some((s) => overlaps(ent.x, ent.y + dy, ent.w, ent.h, s.x, s.y, s.w, s.h));
        return {
            x: ent.x + (canX ? dx : 0),
            y: ent.y + (canY ? dy : 0),
            blockedX: !canX,
            blockedY: !canY,
        };
    }
    collectProximityEntityIds(entities, radius) {
        const ids = new Set();
        for (let i = 0; i < entities.length; i += 1) {
            const e = entities[i];
            const nearby = resolveTargetEntityIds(entities, e.id, { type: 'radius', value: radius });
            if (nearby.length > 0) {
                ids.add(e.id);
            }
        }
        return ids;
    }
}
//# sourceMappingURL=playtest-runner.js.map