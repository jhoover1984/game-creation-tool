/**
 * EXPORT-BUILD-001 deterministic export baseline.
 * Produces stable JSON artifacts + metadata from equivalent project state and seed.
 */
export function buildDeterministicExport(input) {
    const snapshot = {
        manifest: input.manifest,
        tileLayers: input.tileLayers,
        entities: input.entities,
        story: { questGraph: input.questGraph },
        behaviors: input.behaviors,
        effectState: input.effectState,
    };
    const projectJson = canonicalStringify(snapshot);
    const sourceHash = fnv1a32(projectJson);
    const compatibilityMarker = [
        'gcsv2-web',
        `project-${input.manifest.version}`,
        `quest-${input.questGraph.schemaVersion}`,
        'build-1',
    ].join(':');
    const buildId = fnv1a32(`${sourceHash}:${input.seed}:${compatibilityMarker}`);
    const manifestJson = canonicalStringify({
        buildId,
        buildSchemaVersion: '1.0.0',
        compatibilityMarker,
        sourceHash,
        seed: input.seed,
    });
    const preArtifacts = [
        toArtifact('export/project.json', projectJson),
        toArtifact('export/manifest.json', manifestJson),
    ];
    const provenanceJson = canonicalStringify({
        buildId,
        sourceHash,
        seed: input.seed,
        artifacts: preArtifacts.map((a) => ({ path: a.path, hash: a.hash, bytes: a.bytes })),
    });
    const artifacts = [...preArtifacts, toArtifact('export/provenance.json', provenanceJson)]
        .sort((a, b) => a.path.localeCompare(b.path));
    return {
        ok: true,
        buildId,
        metadata: {
            buildSchemaVersion: '1.0.0',
            compatibilityMarker,
            projectVersion: input.manifest.version,
            questSchemaVersion: input.questGraph.schemaVersion,
            seed: input.seed,
            sourceHash,
        },
        artifacts,
        projectJson,
        manifestJson,
        provenanceJson,
    };
}
function toArtifact(path, content) {
    return {
        path,
        bytes: content.length,
        hash: fnv1a32(content),
    };
}
function canonicalStringify(value) {
    return JSON.stringify(sortValue(value), null, 2);
}
function sortValue(value) {
    if (Array.isArray(value)) {
        return value.map((item) => sortValue(item));
    }
    if (value && typeof value === 'object') {
        const input = value;
        const keys = Object.keys(input).sort((a, b) => a.localeCompare(b));
        const out = {};
        for (let i = 0; i < keys.length; i += 1) {
            const key = keys[i];
            out[key] = sortValue(input[key]);
        }
        return out;
    }
    return value;
}
function fnv1a32(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}
//# sourceMappingURL=export-build.js.map