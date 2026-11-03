// Fingerprint only assets the isolated server can serve. No watcher or idle timer.
import {createHash} from 'node:crypto';
import {readdir, readFile, stat} from 'node:fs/promises';
import path from 'node:path';

const digest = entries => createHash('sha256').update(JSON.stringify(entries)).digest('hex').slice(0, 12);

export function createPreviewRevisions({directory, extensions, extraFiles = []}) {
  const cached = new Map();
  let pending, snapshot, checkedAt = 0;
  async function assets(folder = directory, prefix = '') {
    const entries = await readdir(folder, {withFileTypes:true});
    const nested = await Promise.all(entries.filter(entry => !entry.name.startsWith('.') && entry.name.toLowerCase() !== 'api').map(async entry => {
      const name = prefix + entry.name, file = path.join(folder, entry.name);
      if (entry.isDirectory()) return assets(file, name + '/');
      return entry.isFile() && extensions.includes(path.extname(name).toLowerCase()) ? [{name, file}] : [];
    }));
    return nested.flat();
  }
  async function fingerprint({name, file}) {
    const info = await stat(file);
    const key = [info.size, info.mtimeMs, info.ctimeMs].join(':');
    let entry = cached.get(file);
    if (entry?.key !== key) {
      entry = {key, hash:createHash('sha256').update(await readFile(file)).digest('hex')};
      cached.set(file, entry);
    }
    return [name, entry.hash];
  }
  return function revisions() {
    if (pending) return pending;
    if (snapshot && Date.now() - checkedAt < 200) return Promise.resolve(snapshot);
    pending = (async () => {
      const files = [...await assets(), ...extraFiles];
      const entries = (await Promise.all(files.map(fingerprint))).sort(([a], [b]) => a.localeCompare(b));
      const current = new Set(files.map(entry => entry.file));
      for (const file of cached.keys()) if (!current.has(file)) cached.delete(file);
      snapshot = {revision:digest(entries), reloadRevision:digest(entries.filter(([name]) => !name.endsWith('.css'))),
        styles:Object.fromEntries(entries.filter(([name]) => name.endsWith('.css')).map(([name, hash]) => ['/' + name.split('/').map(encodeURIComponent).join('/'), hash.slice(0, 12)]))};
      checkedAt = Date.now();
      return snapshot;
    })().finally(() => { pending = null; });
    return pending;
  };
}
