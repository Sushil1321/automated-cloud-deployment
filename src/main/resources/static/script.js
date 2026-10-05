/* CloudDeploy — dashboard behaviour. Edit CONFIG only. */
const CONFIG = {
  appUrl: "http://16.170.140.106:8080",
  repoUrl: "https://github.com/Sushil1321/automated-cloud-deployment",
  // Turn on once the backend serves a health endpoint on the same origin as this page.
  liveCheck: false,
  healthUrl: "/actuator/health",
  pollMs: 30000 // 0 turns polling off
};

const $ = id => document.getElementById(id);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* links */
["openAppBtn", "openAppBtn2"].forEach(id => { $(id).href = CONFIG.appUrl; });
$("repoBtn").href = CONFIG.repoUrl;

/* health */
function setHealth(state, headline, detail) {
  const pulse = $("healthPulse");
  pulse.className = "pulse" + (state === "ok" ? " is-ok" : state === "fail" ? " is-fail" : "");
  $("healthState").textContent = headline;
  $("healthSub").textContent = detail;
  $("lastChecked").textContent = new Date().toLocaleTimeString();
  $("tileApp").textContent = state === "ok" ? "Running" : state === "fail" ? "Down" : "Unknown";
}

async function checkHealth() {
  if (!CONFIG.liveCheck) {
    return setHealth("ok", "Application is running",
      "Shown from the page config. Set liveCheck to true to poll the server.");
  }
  setHealth("idle", "Checking the application…", "Asking the server how it feels.");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(CONFIG.healthUrl, { signal: ctrl.signal, cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    const up = res.ok && (body.status === undefined || body.status === "UP");
    up ? setHealth("ok", "Application is running", "The container answered on port 8080.")
       : setHealth("fail", "Application is not healthy", "The server answered but is not ready. Check the container logs on EC2.");
  } catch {
    setHealth("fail", "Application is unreachable",
      "No answer from " + CONFIG.healthUrl + ". Check the container is up and the port is open.");
  } finally { clearTimeout(timer); }
}
$("recheckBtn").addEventListener("click", checkHealth);
checkHealth();
if (CONFIG.liveCheck && CONFIG.pollMs > 0) setInterval(checkHealth, CONFIG.pollMs);

/* log replay */
const LOG = [
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
const logBody = $("logBody");
let logTimer;

function renderLog(n) {
  logBody.innerHTML = LOG.slice(0, n)
    .map(([t, msg]) => `<span class="${t === "OK" ? "t-ok" : "t-tag"}">[${t.padEnd(4)}]</span> ${msg}`)
    .join("\n") + (n < LOG.length ? '\n<span class="caret">&nbsp;</span>' : "");
}
function playLog() {
  clearInterval(logTimer);
  if (reduceMotion) return renderLog(LOG.length);
  let i = 0;
  renderLog(0);
  logTimer = setInterval(() => { renderLog(++i); if (i >= LOG.length) clearInterval(logTimer); }, 320);
}
$("replayBtn").addEventListener("click", playLog);

/* counters + log start when scrolled into view */
function countUp(el) {
  const target = +el.dataset.count, suffix = el.dataset.suffix || "";
  if (reduceMotion) { el.textContent = target + suffix; return; }
  let s = 0;
  const t = setInterval(() => {
    el.textContent = Math.round(target * ++s / 28) + suffix;
    if (s >= 28) clearInterval(t);
  }, 28);
}
const io = new IntersectionObserver(entries => entries.forEach(e => {
  if (!e.isIntersecting) return;
  io.unobserve(e.target);
  e.target.id === "logBody" ? playLog() : countUp(e.target);
}), { threshold: 0.4 });
document.querySelectorAll("[data-count]").forEach(el => io.observe(el));
io.observe(logBody);