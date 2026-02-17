const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../apps/web/messages/en.json');
const esPath = path.join(__dirname, '../apps/web/messages/es.json');

if (!fs.existsSync(enPath) || !fs.existsSync(esPath)) {
    console.error('Translation files not found.');
    process.exit(1);
}

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const es = JSON.parse(fs.readFileSync(esPath, 'utf8'));

function compareKeys(obj1, obj2, prefix = '', missingIn2 = []) {
    for (const key in obj1) {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        if (!obj2.hasOwnProperty(key)) {
            missingIn2.push(newPrefix);
        } else if (typeof obj1[key] === 'object' && obj1[key] !== null && !Array.isArray(obj1[key])) {
            compareKeys(obj1[key], obj2[key], newPrefix, missingIn2);
        }
    }
    return missingIn2;
}

const missingInEs = compareKeys(en, es);
const missingInEn = compareKeys(es, en);

if (missingInEs.length > 0) {
    console.log('Keys missing in ES:', missingInEs);
} else {
    console.log('ES is complete.');
}

if (missingInEn.length > 0) {
    console.log('Keys missing in EN:', missingInEn);
} else {
    console.log('EN is complete.');
}
