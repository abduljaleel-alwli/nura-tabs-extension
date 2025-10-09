// Splash timing
const SPLASH_MIN_MS = 1200;
const SPLASH_MAX_MS = 2000;

const logo = document.getElementById("brandLogo");
const app = document.getElementById("app");
const frame = document.getElementById("mainFrame");
const offlineDiv = document.getElementById("offline");
const retryBtn = document.getElementById("retryBtn");
const toast = document.getElementById("toast");

const start = performance.now();

// Toast notification helper
function showToast(msg = "No internet connection", ms = 1600) {
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  void toast.offsetWidth; // restart CSS transition
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => (toast.hidden = true), 250);
  }, ms);
}

// Toggle UI between online/offline
function showOffline() {
  frame.setAttribute("hidden", "");
  offlineDiv.removeAttribute("hidden");
}

function showFrame() {
  offlineDiv.setAttribute("hidden", "");
  frame.removeAttribute("hidden");
}

// Detect and update based on connection state
function handleConnectionChange() {
  if (navigator.onLine === false) {
    showOffline();
  } else {
    showFrame();
  }
}

// Reveal app after splash delay
function revealApp() {
  const elapsed = performance.now() - start;
  const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
  setTimeout(() => {
    document.body.classList.add("app-ready");
    app.hidden = false;

    handleConnectionChange(); // Initial connection check
    setupDraggableFAB();
  }, wait);
}

// Initialize splash screen with fallback timeout
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

// Entry point
document.addEventListener("DOMContentLoaded", () => {
  initSplash();

  window.addEventListener("online", () => {
    handleConnectionChange();
    frame.src = frame.src; // reload iframe
    showToast("Connection restored");
  });

  window.addEventListener("offline", () => {
    handleConnectionChange();
    showToast("Connection lost");
  });

  retryBtn?.addEventListener("click", () => {
    if (navigator.onLine) {
      frame.src = frame.src;
      handleConnectionChange();
      showToast("Refreshing...");
    } else {
      retryBtn.classList.remove("shake");
      void retryBtn.offsetWidth;
      retryBtn.classList.add("shake");
      showToast("You are offline");
    }
  });
});


// ===== Settings FAB: draggable + inertia + edge snap + auto-hide =====
const FAB_KEY = "settingsFabPos"; // {left:number, top:number, side:"left"|"right"}
const AUTO_HIDE_MS = 3000;
const EDGE_MARGIN = 12;
const CLICK_THRESHOLD = 6;
const INERTIA_DECAY = 0.92;
const MAX_SPEED = 2.2;
const PEEK_OFFSET = 28;

function setupDraggableFAB() {
  const btn = document.getElementById("openSettingsBtn");
  if (!btn) return;
  btn.setAttribute("aria-label", "Settings");

  // Indicates whether a saved position exists
  let hasSavedPos = false;

  // Load saved position (if exists)
  const applySavedPosition = () => {
    chrome.storage.sync.get(FAB_KEY, (data) => {
      const pos = data[FAB_KEY];
      if (pos && Number.isFinite(pos.left) && Number.isFinite(pos.top)) {
        hasSavedPos = true;
        btn.style.left = `${pos.left}px`;
        btn.style.top = `${pos.top}px`;
        btn.style.right = "auto";
        btn.style.bottom = "auto";
        btn.dataset.side = pos.side || "left";
      } else {
        hasSavedPos = false;
        btn.style.removeProperty("top");
        btn.style.removeProperty("right");
        btn.style.left = "16px";
        btn.style.bottom = "16px";
        btn.dataset.side = "left";
      }
      scheduleAutoHide();
    });
  };

  // Wait one frame to ensure layout is ready
  requestAnimationFrame(applySavedPosition);

  let dragging = false;
  let moved = false;
  let startX = 0,
    startY = 0;
  let origLeft = 0,
    origTop = 0;

  // For inertia (velocity tracking)
  let lastT = 0,
    lastX = 0,
    lastY = 0;
  let vx = 0,
    vy = 0;

  let hideTimer = null;
  let inertiaRAF = null;

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }
  function vw() {
    return window.innerWidth;
  }
  function vh() {
    return window.innerHeight;
  }
  function bw() {
    return btn.offsetWidth;
  }
  function bh() {
    return btn.offsetHeight;
  }

  function clearInertia() {
    if (inertiaRAF) cancelAnimationFrame(inertiaRAF);
    inertiaRAF = null;
  }

  function scheduleAutoHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      autoHide();
    }, AUTO_HIDE_MS);
  }

  function cancelAutoHide() {
    clearTimeout(hideTimer);
  }

  // Partially hide the button (peek state)
  function autoHide() {
    if (dragging) return;
    const side = btn.dataset.side === "right" ? "right" : "left";
    btn.classList.add("sleep");
    if (side === "left") {
      btn.classList.add("peek-left");
      btn.classList.remove("peek-right");
    } else {
      btn.classList.add("peek-right");
      btn.classList.remove("peek-left");
    }
  }

  function revealFromPeek() {
    btn.classList.remove("sleep", "peek-left", "peek-right");
  }

  // Snap button to nearest screen edge and save position
  function snapToNearestEdge() {
    const rect = btn.getBoundingClientRect();
    const toRight = rect.left + rect.width / 2 > vw() / 2;
    const left = toRight ? vw() - bw() - EDGE_MARGIN : EDGE_MARGIN;

    btn.style.left = `${left}px`;
    btn.style.right = "auto";
    btn.dataset.side = toRight ? "right" : "left";

    chrome.storage.sync.set({
      [FAB_KEY]: {
        left,
        top: rect.top,
        side: btn.dataset.side,
      },
    });
  }

  // Keep button inside viewport bounds
  function keepInsideViewport() {
    const rect = btn.getBoundingClientRect();
    const left = clamp(rect.left, EDGE_MARGIN, vw() - bw() - EDGE_MARGIN);
    const top = clamp(rect.top, EDGE_MARGIN, vh() - bh() - EDGE_MARGIN);
    btn.style.left = `${left}px`;
    btn.style.top = `${top}px`;
    btn.style.right = "auto";
    btn.style.bottom = "auto";
  }

  // Apply inertia (smooth sliding after drag)
  function startInertia() {
    clearInertia();
    const start = performance.now();
    function step(now) {
      const dt = Math.max(1, now - (lastT || start));
      lastT = now;

      vx *= INERTIA_DECAY;
      vy *= INERTIA_DECAY;

      if (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01) {
        clearInertia();
        snapToNearestEdge();
        scheduleAutoHide();
        return;
      }

      const rect = btn.getBoundingClientRect();
      let nx = rect.left + vx * dt;
      let ny = rect.top + vy * dt;

      const minX = EDGE_MARGIN,
        maxX = vw() - bw() - EDGE_MARGIN;
      const minY = EDGE_MARGIN,
        maxY = vh() - bh() - EDGE_MARGIN;

      // Bounce effect at edges
      if (nx < minX) {
        nx = minX;
        vx = -vx * 0.4;
      }
      if (nx > maxX) {
        nx = maxX;
        vx = -vx * 0.4;
      }
      if (ny < minY) {
        ny = minY;
        vy = -vy * 0.4;
      }
      if (ny > maxY) {
        ny = maxY;
        vy = -vy * 0.4;
      }

      btn.style.left = `${nx}px`;
      btn.style.top = `${ny}px`;
      inertiaRAF = requestAnimationFrame(step);
    }
    inertiaRAF = requestAnimationFrame(step);
  }

  function onPointerDown(e) {
    clearInertia();
    cancelAutoHide();
    revealFromPeek();

    btn.setPointerCapture?.(e.pointerId);

    const rect = btn.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    origLeft = rect.left;
    origTop = rect.top;
    dragging = true;
    moved = false;
    btn.classList.add("dragging");

    lastT = performance.now();
    lastX = startX;
    lastY = startY;
    vx = vy = 0;
  }

  function onPointerMove(e) {
    if (!dragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (!moved && (Math.abs(dx) > CLICK_THRESHOLD || Math.abs(dy) > CLICK_THRESHOLD)) {
      moved = true;
    }

    let newLeft = origLeft + dx;
    let newTop = origTop + dy;

    const minX = EDGE_MARGIN,
      maxX = vw() - bw() - EDGE_MARGIN;
    const minY = EDGE_MARGIN,
      maxY = vh() - bh() - EDGE_MARGIN;

    newLeft = clamp(newLeft, minX, maxX);
    newTop = clamp(newTop, minY, maxY);

    btn.style.left = `${newLeft}px`;
    btn.style.top = `${newTop}px`;
    btn.style.right = "auto";
    btn.style.bottom = "auto";

    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    vx = (e.clientX - lastX) / dt;
    vy = (e.clientY - lastY) / dt;
    vx = clamp(vx, -MAX_SPEED, MAX_SPEED);
    vy = clamp(vy, -MAX_SPEED, MAX_SPEED);
    lastT = now;
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    btn.classList.remove("dragging");

    if (!moved) {
      // Click: open settings page
      chrome.runtime.openOptionsPage();
      scheduleAutoHide();
      return;
    }

    startInertia();
  }

  // Show button when user moves near screen edges
  function onGlobalPointerMove(e) {
    if (dragging) return;
    const nearEdge = e.clientX < 48 || e.clientX > vw() - 48;
    if (nearEdge) revealFromPeek();
    scheduleAutoHide();
  }

  btn.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointermove", onGlobalPointerMove);

  // Keep FAB visible and positioned correctly on resize
  window.addEventListener("resize", () => {
    revealFromPeek();
    keepInsideViewport();
    scheduleAutoHide();
  });
}
