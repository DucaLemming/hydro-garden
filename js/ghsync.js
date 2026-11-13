// Saves the garden to a file in the GitHub repo (branch "garden-data") so every device shows the same state.
// The access token stays in this browser only. It is never part of the saved garden or of transfer links.
const KEY = 'hydro-garden-sync';
const API = 'https://api.github.com';
export const BRANCH = 'garden-data', FILE = 'garden.json';

export function loadCfg() { try { return { token: '', sha: null, repo: '', ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { token: '', sha: null }; } }
export function saveCfg(cfg) { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* ignore */ } }
export function repoFromLocation(loc) {
  const m = loc.hostname.match(/^([\w-]+)\.github\.io$/i), seg = loc.pathname.split('/').filter(Boolean)[0];
  return m && seg ? `${m[1]}/${seg}` : 'DucaLemming/hydro-garden';
}
const enc = s => { let bin = ''; new TextEncoder().encode(s).forEach(b => { bin += String.fromCharCode(b); }); return btoa(bin); };
const dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));

async function call(fetchFn, token, method, path, body) {
  const r = await fetchFn(API + path, { method, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(r.status === 401 ? 'GitHub rejected the token. It may be mistyped or expired.' : r.status === 403 ? 'The token is not allowed to write to this repository. It needs "Contents: Read and write".' : r.status === 404 ? 'not found' : (j.message || `GitHub answered with error ${r.status}.`));
    e.status = r.status; throw e;
  }
  return j;
}

// branch = null means the repository's default branch (used for a separate data repository).
export async function pull({ token, repo, branch = BRANCH, fetchFn = fetch }) {
  try {
    const j = await call(fetchFn, token, 'GET', `/repos/${repo}/contents/${FILE}?${branch ? `ref=${branch}&` : ''}t=${Date.now()}`);
    let state = null; try { state = JSON.parse(dec(j.content)); } catch { /* unreadable: treat as empty */ }
    return { state, sha: j.sha };
  } catch (e) {
    if (e.status === 404 && !branch) {
      // A fresh data repository has no file yet. Make sure the token can see the repository at all.
      try { await call(fetchFn, token, 'GET', `/repos/${repo}`); return { state: null, sha: null }; } catch (e2) { if (e2.status !== 404) throw e2; }
    }
    if (e.status === 404) { const err = new Error(`The token cannot see ${repo}, or its "${BRANCH}" branch is missing. Check that the token is limited to this repository with "Contents: Read and write".`); err.status = 404; throw err; }
    throw e;
  }
}
export async function push({ token, repo, state, sha, branch = BRANCH, fetchFn = fetch }) {
  const j = await call(fetchFn, token, 'PUT', `/repos/${repo}/contents/${FILE}`, { message: 'Save garden', content: enc(JSON.stringify(state)), sha: sha || undefined, branch: branch || undefined });
  return j.content.sha;
}
const stamp = st => (st && st.updatedAt) || 0;

// Newest change wins. Returns what happened and the state to keep.
export async function reconcile({ token, repo, local, branch = BRANCH, fetchFn = fetch, retry = true }) {
  const remote = await pull({ token, repo, branch, fetchFn });
  if (stamp(remote.state) > stamp(local)) return { action: 'pulled', state: remote.state, sha: remote.sha };
  if (stamp(local) > stamp(remote.state)) {
    try { return { action: 'pushed', state: local, sha: await push({ token, repo, state: local, sha: remote.sha, branch, fetchFn }) }; }
    catch (e) { if (retry && (e.status === 409 || e.status === 422)) return reconcile({ token, repo, local, branch, fetchFn, retry: false }); throw e; }
  }
  return { action: 'same', state: local, sha: remote.sha };
}

// Reads another small JSON file next to the garden (written by the calendar job on GitHub). Missing file = null.
export async function readJson({ token, repo, branch = BRANCH, file, fetchFn = fetch }) {
  try {
    const j = await call(fetchFn, token, 'GET', `/repos/${repo}/contents/${file}?${branch ? `ref=${branch}&` : ''}t=${Date.now()}`);
    return JSON.parse(dec(j.content));
  } catch { return null; }
}
