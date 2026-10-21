
/* CloudDeploy — Dashboard Behaviour
   Update CONFIG when your application URL changes.
*/

const CONFIG = {
    appUrl: "http://16.171.3.12:8080",
    repoUrl: "https://github.com/Sushil1321/automated-cloud-deployment",

    // Keep false until you have configured a working health endpoint.
    liveCheck: false,
    healthUrl: "/actuator/health",
    pollMs: 30000
};

const $ = (id) => document.getElementById(id);

const reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;


/* ========================================
   1. INITIALIZE DASHBOARD
======================================== */

function initDashboard() {
    setupLinks();
    setupHealthCheck();
    setupCounters();
    setupDeploymentLog();
}


/* ========================================
   2. APPLICATION AND REPOSITORY LINKS
======================================== */

function setupLinks() {
    ["openAppBtn", "openAppBtn2"].forEach((id) => {
        const link = $(id);

        if (link) {
            link.href = CONFIG.appUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        }
    });

    const repoBtn = $("repoBtn");

    if (repoBtn) {
        repoBtn.href = CONFIG.repoUrl;
        repoBtn.target = "_blank";
        repoBtn.rel = "noopener noreferrer";
    }
}


/* ========================================
   3. APPLICATION STATUS
======================================== */

function setHealth(state, headline, detail) {
    const pulse = $("healthPulse");
    const stateText = $("healthState");
    const subText = $("healthSub");
    const checkedText = $("lastChecked");
    const tileApp = $("tileApp");

    if (pulse) {
        pulse.className =
            "pulse" +
            (state === "ok" ? " is-ok" :
             state === "fail" ? " is-fail" : "");
    }

    if (stateText) {
        stateText.textContent = headline;
    }

    if (subText) {
        subText.textContent = detail;
    }

    if (checkedText) {
        checkedText.textContent = new Date().toLocaleTimeString();
    }

    if (tileApp) {
        tileApp.textContent =
            state === "ok" ? "Running" :
            state === "fail" ? "Down" : "Unknown";
    }
}

function setupHealthCheck() {
    const recheckBtn = $("recheckBtn");

    async function checkHealth() {
        if (!CONFIG.liveCheck) {
            setHealth(
                "idle",
                "Live check is disabled",
                "The dashboard is not currently checking the server."
            );
            return;
        }

        setHealth(
            "idle",
            "Checking application...",
            "Contacting the health endpoint."
        );

        const controller = new AbortController();

        const timeoutId = window.setTimeout(() => {
            controller.abort();
        }, 5000);

        try {
            const response = await fetch(CONFIG.healthUrl, {
                method: "GET",
                cache: "no-store",
                signal: controller.signal
            });

            const data = await response.json().catch(() => ({}));

            const healthy =
                response.ok &&
                (data.status === undefined || data.status === "UP");

            if (healthy) {
                setHealth(
                    "ok",
                    "Application is responding",
                    "The health endpoint returned a healthy response."
                );
            } else {
                setHealth(
                    "fail",
                    "Application is not healthy",
                    "Check the health endpoint and container logs."
                );
            }
        } catch (error) {
            setHealth(
                "fail",
                "Health check failed",
                "Could not reach the health endpoint. Check the server and URL."
            );
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    if (recheckBtn) {
        recheckBtn.addEventListener("click", checkHealth);
    }

    checkHealth();

    if (CONFIG.liveCheck && CONFIG.pollMs > 0) {
        window.setInterval(checkHealth, CONFIG.pollMs);
    }
}


/* ========================================
   4. DEPLOYMENT STATISTICS COUNTERS
======================================== */

function setupCounters() {
    const counters = document.querySelectorAll("[data-count]");

    function animateCounter(element) {
        if (element.dataset.counted === "true") {
            return;
        }

        element.dataset.counted = "true";

        const target = Number(element.dataset.count);
        const suffix = element.dataset.suffix || "";

        if (!Number.isFinite(target)) {
            element.textContent = "0" + suffix;
            return;
        }

        if (reduceMotion || target === 0) {
            element.textContent = target + suffix;
            return;
        }

        const duration = 900;
        const startTime = performance.now();

        function update(now) {
            const progress = Math.min(
                (now - startTime) / duration,
                1
            );

            // Smooth animation.
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(target * eased);

            element.textContent = currentValue + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target + suffix;
            }
        }

        requestAnimationFrame(update);
    }

    // No scrolling or IntersectionObserver required.
    counters.forEach(animateCounter);
}


/* ========================================
   5. DEPLOYMENT LOG REPLAY
======================================== */

function setupDeploymentLog() {
    const logBody = $("logBody");
    const replayBtn = $("replayBtn");

    if (!logBody || !replayBtn) {
        console.error(
            "Deployment log not initialized: logBody or replayBtn is missing."
        );
        return;
    }

    // These are example messages, not live GitHub Actions logs.
    const LOG = [
        ["INFO", "Starting CI/CD deployment workflow"],
        ["INFO", "Checking out source code from GitHub"],
        ["INFO", "Setting up Java 21 and Maven"],
        ["INFO", "Running Maven tests"],
        ["OK", "Maven tests completed successfully"],
        ["INFO", "Building the Spring Boot application"],
        ["INFO", "Creating Docker image"],
        ["INFO", "Logging in to Docker Hub"],
        ["INFO", "Pushing image to Docker Hub"],
        ["INFO", "Connecting to AWS EC2"],
        ["INFO", "Pulling the latest Docker image"],
        ["INFO", "Restarting automated-cloud-app"],
        ["OK", "Deployment workflow completed"]
    ];

    let timer = null;
    let runNumber = 0;

    function addLogLine(type, message) {
        const line = document.createElement("div");
        const label = document.createElement("span");

        label.className = type === "OK" ? "t-ok" : "t-tag";
        label.textContent = "[" + type + "] ";

        line.appendChild(label);
        line.appendChild(document.createTextNode(message));

        logBody.appendChild(line);
    }

    function replayLog() {
        runNumber++;
        const thisRun = runNumber;

        if (timer !== null) {
            window.clearInterval(timer);
            timer = null;
        }

        logBody.replaceChildren();

        replayBtn.disabled = true;
        replayBtn.textContent = "Running...";

        let index = 0;

        function finish() {
            if (thisRun !== runNumber) {
                return;
            }

            if (timer !== null) {
                window.clearInterval(timer);
                timer = null;
            }

            replayBtn.disabled = false;
            replayBtn.textContent = "Replay";
        }

        function showNextLine() {
            if (thisRun !== runNumber) {
                return;
            }

            if (index >= LOG.length) {
                finish();
                return;
            }

            const [type, message] = LOG[index];

            addLogLine(type, message);
            index++;

            if (index >= LOG.length) {
                finish();
            }
        }

        // Display the complete log for users who prefer reduced motion.
        if (reduceMotion) {
            LOG.forEach(([type, message]) => {
                addLogLine(type, message);
            });

            finish();
            return;
        }

        // Show the first line immediately.
        showNextLine();

        if (index < LOG.length) {
            timer = window.setInterval(showNextLine, 500);
        }
    }

    replayBtn.addEventListener("click", replayLog);

    // Automatically display the log on page load.
    replayLog();
}


/* ========================================
   6. START THE DASHBOARD
======================================== */

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboard, {
        once: true
    });
} else {
    initDashboard();
}
