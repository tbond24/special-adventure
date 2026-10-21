// Explicit asset update; no installation hook or deployment behavior.
import {readFile, mkdir, copyFile} from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const installed = JSON.parse(await readFile(new URL('node_modules/posthog-js/package.json', root)));
const manifest = JSON.parse(await readFile(new URL('package.json', root)));
if (installed.version !== manifest.dependencies['posthog-js']) throw Error('Use the exact locked PostHog version');
const target = new URL('app/vendor/posthog/', root);
await mkdir(target, {recursive:true});
await copyFile(new URL('node_modules/posthog-js/dist/array.no-external.js', root), new URL('posthog.js', target));
await copyFile(new URL('node_modules/posthog-js/LICENSE', root), new URL('LICENSE', target));
console.log(`Synced local PostHog ${installed.version}; no analytics enabled.`);
