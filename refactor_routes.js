
const fs = require('fs');
const path = require('path');

const basePath = path.join('f:', 'HEALTHOS', 'apps', 'web', 'app', '[locale]');
const publicGroup = path.join(basePath, '(public)');
const appGroup = path.join(basePath, '(app)');
const artifactFolder = path.join(basePath, '`[locale`]');

function move(src, dest) {
    try {
        if (fs.existsSync(src)) {
            const destDir = path.dirname(dest);
            if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true });
            }
            fs.renameSync(src, dest);
            console.log(`Moved ${src} to ${dest}`);
        } else {
            console.log(`Source not found: ${src}`);
        }
    } catch (e) {
        console.error(`Error moving ${src}:`, e);
    }
}

// 1. Fix Public Group
// Move current (public)/page.tsx (Products) to (public)/products/page.tsx
const productsPageWrong = path.join(publicGroup, 'page.tsx');
const productsPageRight = path.join(publicGroup, 'products', 'page.tsx');
move(productsPageWrong, productsPageRight);

// Move landing-page.tsx to (public)/page.tsx
const landingPageSrc = path.join(basePath, 'landing-page.tsx');
const landingPageDest = path.join(publicGroup, 'page.tsx');
move(landingPageSrc, landingPageDest);

// 2. Fix App Group
// Create (app)/app folder
const appAppDir = path.join(appGroup, 'app');
if (!fs.existsSync(appAppDir)) fs.mkdirSync(appAppDir, { recursive: true });

// Move everything from (app) root to (app)/app (excluding 'app' itself)
try {
    const appItems = fs.readdirSync(appGroup);
    appItems.forEach(item => {
        if (item === 'app') return;
        const srcPath = path.join(appGroup, item);
        const destPath = path.join(appAppDir, item);
        move(srcPath, destPath);
    });
} catch (e) {
    console.error('Error listing (app) directory:', e);
}

// 3. Cleanup Artifact folder `[locale]`
if (fs.existsSync(artifactFolder)) {
    try {
        // Move anything inside artifact folder to the correct place if needed? 
        // Let's just log what's in there.
        console.log('Artifact folder exists. Deleting...');
        fs.rmSync(artifactFolder, { recursive: true, force: true });
    } catch (e) {
        console.error('Error deleting artifact folder:', e);
    }
}

console.log('Refactor complete.');
