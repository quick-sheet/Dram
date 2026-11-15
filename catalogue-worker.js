/* Loads and reads whiskies.csv off the main thread, so the app stays smooth while 6,000 rows are parsed. */
importScripts('core.js' + self.location.search);
self.onmessage = async () => {
  try {
    const r = await fetch('whiskies.csv', { cache: 'no-cache' });
    if (!r.ok) throw new Error('The catalogue file answered ' + r.status);
    const list = self.Core.catalogue(await r.text());
    self.postMessage({ ok: true, list });
  } catch (err) {
    self.postMessage({ ok: false, error: String((err && err.message) || err) });
  }
};
