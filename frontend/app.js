async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }

    return response.json();
}


function setStatus(elementId, value, isHealthy = true) {
    const element = document.getElementById(elementId);

    element.textContent = value;
    element.classList.remove("loading", "online", "error");

    if (isHealthy) {
        element.classList.add("online");
    } else {
        element.classList.add("error");
    }
}


async function loadStatus() {
    try {
        const data = await fetchJson("/api/status");

        setStatus("application-status", data.application);
        setStatus("api-status", data.api);
        setStatus("database-status", data.database);
        setStatus("environment-status", data.environment, true);

    } catch (error) {
        console.error("Failed to load application status:", error);

        setStatus("application-status", "unavailable", false);
        setStatus("api-status", "unavailable", false);
        setStatus("database-status", "unavailable", false);
        setStatus("environment-status", "unknown", false);
    }
}


async function loadInfo() {
    try {
        const data = await fetchJson("/api/info");

        document.getElementById("version").textContent = data.version;
        document.getElementById("platform").textContent = data.platform;
        document.getElementById("runtime").textContent = data.runtime;
        document.getElementById("application-info").textContent = data.application;

    } catch (error) {
        console.error("Failed to load deployment information:", error);

        document.getElementById("version").textContent = "Unavailable";
        document.getElementById("platform").textContent = "Unavailable";
        document.getElementById("runtime").textContent = "Unavailable";
        document.getElementById("application-info").textContent = "Unavailable";
    }
}


function formatDate(value) {
    if (!value) {
        return "Unknown time";
    }

    return new Date(value).toLocaleString();
}


async function loadDeployments() {
    const container = document.getElementById("deployments");

    try {
        const deployments = await fetchJson("/api/deployments");

        if (!deployments.length) {
            container.innerHTML = `
                <div class="loading">
                    No deployments recorded yet.
                </div>
            `;

            return;
        }

        container.innerHTML = deployments.map(deployment => `
            <div class="deployment">
                <div class="deployment-version">
                    ${deployment.version}
                </div>

                <div class="deployment-meta">
                    Status:
                    <span class="success">
                        ${deployment.status}
                    </span>
                    · Environment:
                    ${deployment.environment}
                    · ${formatDate(deployment.created_at)}
                </div>
            </div>
        `).join("");

    } catch (error) {
        console.error("Failed to load deployments:", error);

        container.innerHTML = `
            <div class="error">
                Unable to load deployment history.
            </div>
        `;
    }
}


async function loadDashboard() {
    await Promise.all([
        loadStatus(),
        loadInfo(),
        loadDeployments()
    ]);
}


loadDashboard();