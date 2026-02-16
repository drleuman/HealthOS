import fs from "fs";
import path from "path";
import { CommunityCatalog } from "./types";

// This loader is intended for SERVER-SIDE use only (Node.js environment)
// as it reads from the filesystem.

// Assuming the content is located relative to the package root or process.cwd()
// Adjust base path if necessary based on monorepo structure at runtime
const CONTENT_BASE = path.join(process.cwd(), "..", "..", "packages", "shared", "content", "community");
// Fallback for different execution contexts (e.g. within nextjs app vs api)
// We might need a more robust path resolution strategy.
// For now, let's try to resolve relative to this file's compiled location,
// or assume a standard monorepo root. 
// Standard structure: 
// root/packages/shared/src/community/loader.ts
// root/packages/shared/content/community/

function getBasePath(): string {
    // If running from keys next app: process.cwd() is usually apps/web
    // So we need to go up to packages/shared/content/community
    if (fs.existsSync(path.join(process.cwd(), "packages", "shared", "content", "community"))) {
        return path.join(process.cwd(), "packages", "shared", "content", "community");
    }
    // If running from apps/web or services/api
    return path.join(process.cwd(), "..", "..", "packages", "shared", "content", "community");
}


function readJson<T>(file: string): T {
    const base = getBasePath();
    const p = path.join(base, file);
    if (!fs.existsSync(p)) {
        console.warn(`[CommunityLoader] File not found: ${p}`);
        return [] as unknown as T;
    }
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

export function loadCommunityCatalog(): CommunityCatalog {
    return {
        products: readJson("products.json"),
        courses: readJson("courses.json"),
        blog: readJson("blog.json"),
    };
}
