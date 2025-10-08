// Splash timing
const SPLASH_MIN_MS = 900;
const SPLASH_MAX_MS = 2000;

const logo = document.getElementById("brandLogo");
const app = document.getElementById("app");
const frame = document.getElementById("mainFrame");
const offlineDiv = document.getElementById("offline");
const retryBtn = document.getElementById("retryBtn");
const toast = document.getElementById("toast");

const start = performance.now();

// Toast helper
function showToast(msg = "لا يوجد اتصال إنترنت حالياً", ms = 1600) {
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  void toast.offsetWidth; // restart transition
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => (toast.hidden = true), 250);
  }, ms);
}

// Force toggle
function showOffline() {
  frame.setAttribute("hidden", "");
  offlineDiv.removeAttribute("hidden");
}
function showFrame() {
  offlineDiv.setAttribute("hidden", "");
  frame.removeAttribute("hidden");
}

// Show offline only if truly offline
function handleConnectionChange() {
  if (navigator.onLine === false) {
    showOffline();
  } else {
    showFrame();
  }
}

// Reveal app after splash
function revealApp() {
  const elapsed = performance.now() - start;
  const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
  setTimeout(() => {
    document.body.classList.add("app-ready");
    app.hidden = false;
    handleConnectionChange(); // initial check
  }, wait);
}

// Init splash with fallback timeout
function initSplash() {
  let done = false;
  const finish = () => {
    if (!done) {
      done = true;
      revealApp();
    }
  };
  setTimeout(finish, SPLASH_MAX_MS);
  if (logo.complete) finish();
  else {
    logo.addEventListener("load", finish, { once: true });
    logo.addEventListener("error", finish, { once: true });
  }
}

// Main
document.addEventListener("DOMContentLoaded", () => {
  initSplash();

  window.addEventListener("online", () => {
    handleConnectionChange();
    frame.src = frame.src; // reload iframe
    showToast("تم استعادة الاتصال");
  });

  window.addEventListener("offline", () => {
    handleConnectionChange();
    showToast("انقطع الاتصال");
  });

  retryBtn?.addEventListener("click", () => {
    if (navigator.onLine) {
      frame.src = frame.src;
      handleConnectionChange();
      showToast("جاري التحديث…");
    } else {
      retryBtn.classList.remove("shake");
      void retryBtn.offsetWidth;
      retryBtn.classList.add("shake");
      showToast("أنت غير متصل بالإنترنت");
    }
  });
});
