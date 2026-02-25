import type { EntityInspectorTarget, InspectorObjectSchema } from '@gcs/contracts';
export declare function renderEntityInspector(target: EntityInspectorTarget, schema: InspectorObjectSchema): string;
export declare function readNumberField(container: HTMLElement, path: string): number | null;
export declare function readTextField(container: HTMLElement, path: string): string | null;
export declare function readBooleanField(container: HTMLElement, path: string): boolean | null;
//# sourceMappingURL=schema-inspector.d.ts.map