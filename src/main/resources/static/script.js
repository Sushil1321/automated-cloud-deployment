/* =========================================================
   CloudDeploy — dashboard behaviour
   Edit CONFIG below; nothing else needs changing.
   ========================================================= */

const CONFIG = {
    // Where the "Open the application" buttons go.
    appUrl: "http://localhost:8080",

    // Your GitHub repository.
    repoUrl: "https://github.com/",

    // Set to true once the backend exposes a health endpoint on the
    // same origin as this page (Spring Boot Actuator does by default).
    liveCheck: false,
    healthUrl: "/actuator/health",

    // Re-check every 30s when liveCheck is on. 0 turns polling off.
    pollMs: 30000
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


/* ---------------- Theme ---------------- */

const root = document.documentElement;
const themeBtn = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");

function applyTheme(theme) {
    root.setAttribute("data-bs-theme", theme);
    const dark = theme === "dark";
    themeIcon.textContent = dark ? "☀" : "🌙";
    themeLabel.textContent = dark ? "Light" : "Dark";
    themeBtn.setAttribute("aria-pressed", String(dark));
}

function savedTheme() {
    try {
        const stored = localStorage.getItem("clouddeploy-theme");
        if (stored) return stored;
    } catch (e) { /* storage blocked — fall through */ }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

applyTheme(savedTheme());

themeBtn.addEventListener("click", () => {
    const next = root.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("clouddeploy-theme", next); } catch (e) { /* ignore */ }
});


/* ---------------- Mobile menu ---------------- */

/* On phones and tablets the menu stays open over the content after a tap,
   so close it once the page has jumped to the section. */
const navMenu = document.getElementById("navMenu");

navMenu.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
        if (!navMenu.classList.contains("show")) return;
        bootstrap.Collapse.getOrCreateInstance(navMenu).hide();
    });
});


/* ---------------- Links ---------------- */

["openAppBtn", "openAppBtn2"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.href = CONFIG.appUrl;
});
const repoBtn = document.getElementById("repoBtn");
if (repoBtn) repoBtn.href = CONFIG.repoUrl;


/* ---------------- Health check ---------------- */

const pulse = document.getElementById("healthPulse");
const stateEl = document.getElementById("healthState");
const subEl = document.getElementById("healthSub");
const checkedEl = document.getElementById("lastChecked");
const tileApp = document.getElementById("tileApp");

function setHealth(state, headline, detail) {
    pulse.classList.remove("is-ok", "is-fail");
    if (state === "ok") pulse.classList.add("is-ok");
    if (state === "fail") pulse.classList.add("is-fail");

    stateEl.textContent = headline;
    subEl.textContent = detail;
    checkedEl.textContent = new Date().toLocaleTimeString();
    if (tileApp) tileApp.textContent = state === "ok" ? "Running" : state === "fail" ? "Down" : "Unknown";
}

async function checkHealth() {
    if (!CONFIG.liveCheck) {
        setHealth("ok", "Application is running",
            "Status shown from the page config — switch liveCheck on to poll the server.");
        return;
    }

    setHealth("idle", "Checking the application…", "Asking the server how it feels.");

    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), 5000);

    try {
        const res = await fetch(CONFIG.healthUrl, { signal: stop.signal, cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        const up = res.ok && (body.status === undefined || body.status === "UP");

        if (up) {
            setHealth("ok", "Application is running", "The container answered on port 8080.");
        } else {
            setHealth("fail", "Application is not healthy",
                "The server answered, but reported it is not ready. Check the container logs on EC2.");
        }
    } catch (err) {
        setHealth("fail", "Application is unreachable",
            "No answer from " + CONFIG.healthUrl + ". Check that the container is up and the port is open.");
    } finally {
        clearTimeout(timer);
    }
}

document.getElementById("recheckBtn").addEventListener("click", checkHealth);
checkHealth();
if (CONFIG.liveCheck && CONFIG.pollMs > 0) setInterval(checkHealth, CONFIG.pollMs);


/* ---------------- Deployment log replay ---------------- */

const LOG_LINES = [
    ["INFO", "Checking out source from GitHub"],
    ["INFO", "Setting up Java 21 and Maven 3.9"],
    ["INFO", "Running mvn test"],
    ["OK", "All tests passed"],
    ["INFO", "Packaging Spring Boot application"],
    ["INFO", "Building Docker image"],
    ["INFO", "Pushing sushil1321/automated-cloud-deployment:latest"],
    ["INFO", "Connecting to AWS EC2 instance"],
    ["INFO", "Pulling newest image"],
    ["INFO", "Stopping container automated-cloud-app"],
    ["INFO", "Starting container on port 8080"],
    ["OK", "Deployment successful"]
];

const logBody = document.getElementById("logBody");
let logTimer = null;

function renderLog(count) {
    logBody.innerHTML = LOG_LINES.slice(0, count).map(([tag, text]) => {
        const cls = tag === "OK" ? "t-ok" : "t-tag";
        return `<span class="${cls}">[${tag.padEnd(4)}]</span> ${text}`;
    }).join("\n") + (count < LOG_LINES.length ? '\n<span class="caret">&nbsp;</span>' : "");
}

function playLog() {
    clearInterval(logTimer);
    if (reduceMotion) { renderLog(LOG_LINES.length); return; }

    let i = 0;
    renderLog(0);
    logTimer = setInterval(() => {
        i += 1;
        renderLog(i);
        if (i >= LOG_LINES.length) clearInterval(logTimer);
    }, 320);
}

document.getElementById("replayBtn").addEventListener("click", playLog);


/* ---------------- Counters ---------------- */

function countUp(el) {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";

    if (reduceMotion) { el.textContent = target + suffix; return; }

    const steps = 28;
    let step = 0;
    const tick = setInterval(() => {
        step += 1;
        el.textContent = Math.round((target * step) / steps) + suffix;
        if (step >= steps) clearInterval(tick);
    }, 28);
}


/* ---------------- Run on first view ---------------- */

const seen = new WeakSet();
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (!entry.isIntersecting || seen.has(entry.target)) return;
        seen.add(entry.target);

        if (entry.target.classList.contains("stat-value")) countUp(entry.target);
        if (entry.target.id === "logBody") playLog();
    });
}, { threshold: 0.4 });

document.querySelectorAll(".stat-value").forEach(el => observer.observe(el));
observer.observe(logBody);


/* ---------------- Copy docker pull ---------------- */

const copyBtn = document.getElementById("copyPull");
copyBtn.addEventListener("click", async () => {
    const text = document.getElementById("pullCmd").textContent;
    try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = "Copied";
    } catch (e) {
        copyBtn.textContent = "Press Ctrl+C";
    }
    setTimeout(() => { copyBtn.textContent = "Copy"; }, 1800);
});