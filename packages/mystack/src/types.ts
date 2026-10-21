import type { Selection } from "./catalog.ts";

export type ProjectFiles = Map<string, string | Buffer>;

export interface ProjectPackage {
	name: string;
	scripts: Record<string, string>;
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
	pnpm?: unknown;
}

export interface ProjectOptions {
	name: string;
	selection: Selection;
	templateRoot?: string;
}

export interface GenerationContext extends ProjectOptions {
	files: ProjectFiles;
	pkg: ProjectPackage;
}
