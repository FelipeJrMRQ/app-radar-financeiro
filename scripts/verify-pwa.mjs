import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = resolve('dist/app-radar-financeiro/browser');
assert.ok(existsSync(root), 'Execute npm run build antes de testar o PWA.');

const manifest = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
assert.equal(manifest.id, '/');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.scope, '/');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.short_name, 'Radar');
assert.equal(manifest.theme_color, '#03111f');
assert.equal(manifest.background_color, '#03111f');

for (const size of [192, 512]) {
  const icon = manifest.icons.find(item => item.sizes === size + 'x' + size);
  assert.ok(icon, 'Ícone obrigatório ausente: ' + size);
  assert.equal(icon.type, 'image/png');
  const bytes = readFileSync(join(root, icon.src.replace(/^\//, '')));
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16), size);
  assert.equal(bytes.readUInt32BE(20), size);
}
const iconMaskable = manifest.icons.find(icon => icon.purpose?.includes('maskable'));
assert.ok(iconMaskable, 'Ícone adaptativo (maskable) é obrigatório.');

const html = readFileSync(join(root, 'index.html'), 'utf8');
assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
assert.match(html, /viewport-fit=cover/);
assert.match(html, /rel="apple-touch-icon"/);

const script = readFileSync(join(root, 'sw.js'), 'utf8');
const handlers = {};
runInNewContext(script, {
  URL,
  self: {
    location: { origin: 'https://radar.example' },
    addEventListener: (name, callback) => { handlers[name] = callback; },
  },
  caches: {},
  fetch: () => { throw Error('API não pode ser interceptada pelo cache do PWA'); },
  Response,
});
assert.equal(typeof handlers.fetch, 'function');
for (const url of [
  'https://radar.example/api/lancamentos',
  'https://radar.example/api/auth/login',
  'https://outro-dominio.example/icons/radar.png',
]) {
  let interceptada = false;
  handlers.fetch({
    request: { method: 'GET', url, mode: 'cors',
      headers: { has: () => false }, destination: 'image' },
    respondWith: () => { interceptada = true; },
  });
  assert.equal(interceptada, false, 'O SW não deve interceptar ' + url);
}
console.log('PWA: validacao estrutural OK (standalone, icones, safe areas, SW sem cache de API).');
console.log('Instalacao Android requer HTTPS valido e build de producao; este teste nao valida o ambiente de hospedagem.');
