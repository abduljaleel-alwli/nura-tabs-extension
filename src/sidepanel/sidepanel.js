const SPLASH_MIN_MS = 900;
const SPLASH_MAX_MS = 2000;
const logo = document.getElementById('brandLogo');
const app = document.getElementById('app');
const start = performance.now();

function revealApp() {
  const elapsed = performance.now() - start;
  const wait = Math.max(0, SPLASH_MIN_MS - elapsed);

  setTimeout(() => {
    document.body.classList.add('app-ready');
    app.hidden = false;
  }, wait);
}

function initSplash() {
  let done = false;
  const finish = () => { if (!done) { done = true; revealApp(); } };
  setTimeout(finish, SPLASH_MAX_MS);

  if (logo.complete) finish();
  else {
    logo.addEventListener('load', finish, { once: true });
    logo.addEventListener('error', finish, { once: true });
  }
}

document.addEventListener('DOMContentLoaded', initSplash);
