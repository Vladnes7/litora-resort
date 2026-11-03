// Scroll-scrubbed surf: the wave from the MAREA study washes in as the visitor reaches the closing planner.
// The video stays paused; scroll position chooses the frame. Nothing is fetched until the scene is near,
// and quiet motion, Save-Data or a load failure keep the still final frame.
export function setupSurf(root, {quiet = false} = {}) {
  const scene = root.querySelector('[data-surf]');
  if (!scene) return () => {};
  const video = scene.querySelector('video');
  const clamp = v => Math.max(0, Math.min(1, v));
  const saveData = navigator.connection?.saveData === true;
  if (quiet || saveData || !video) { scene.classList.add('surf-static'); scene.style.setProperty('--surf-p', '1'); return () => {}; }

  let alive = true, dirty = true, frame = 0, pending = null, ready = false, objectUrl = '';
  const abort = new AbortController();
  const events = new AbortController();

  const progress = () => {
    const r = scene.getBoundingClientRect();
    const travel = Math.max(1, r.height - innerHeight);
    return clamp(-r.top / travel);
  };
  const seek = t => {
    if (video.seeking) { pending = t; return; }
    if (Math.abs(video.currentTime - t) > 1 / 60) video.currentTime = t;
  };
  const paint = () => {
    frame = 0;
    if (!alive || !dirty) return;
    dirty = false;
    const p = progress();
    scene.style.setProperty('--surf-p', p.toFixed(4));
    if (ready && video.duration) seek(p * (video.duration - 0.05));
  };
  const request = () => { dirty = true; if (!frame) frame = requestAnimationFrame(paint); };

  video.addEventListener('seeked', () => {
    if (!ready) { ready = true; scene.classList.add('surf-ready'); }
    if (pending !== null) { const t = pending; pending = null; seek(t); }
  }, {signal: events.signal});
  video.addEventListener('loadeddata', () => { ready = true; scene.classList.add('surf-ready'); request(); }, {signal: events.signal});
  video.addEventListener('error', () => scene.classList.add('surf-static'), {signal: events.signal});

  // Fetch the whole file once so seeking never depends on HTTP Range support of the host.
  const load = async () => {
    try {
      const res = await fetch(video.dataset.src, {signal: abort.signal});
      if (!res.ok) throw new Error(String(res.status));
      objectUrl = URL.createObjectURL(await res.blob());
      if (!alive) return URL.revokeObjectURL(objectUrl);
      video.src = objectUrl;
      video.load();
    } catch (error) {
      if (alive && error.name !== 'AbortError') { scene.classList.add('surf-static'); scene.style.setProperty('--surf-p', '1'); }
    }
  };
  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { io.disconnect(); load(); }
  }, {rootMargin: '150% 0px'});
  io.observe(scene);

  addEventListener('scroll', request, {passive: true, signal: events.signal});
  addEventListener('resize', request, {passive: true, signal: events.signal});
  request();

  return () => {
    alive = false;
    io.disconnect();
    abort.abort();
    events.abort();
    cancelAnimationFrame(frame);
    video.removeAttribute('src');
    video.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };
}
