/**
 * WhatsApp Past Member Extractor - Popup Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    const groupTitle = document.getElementById('groupTitle');
    const connectionStatus = document.getElementById('connectionStatus');
    const welcomeState = document.getElementById('welcomeState');
    const progressState = document.getElementById('progressState');
    const resultsState = document.getElementById('resultsState');
    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');

    const startExtractBtn = document.getElementById('startExtractBtn');
    const reScanBtn = document.getElementById('reScanBtn');
    const searchInput = document.getElementById('searchInput');
    const contactListContainer = document.getElementById('contactListContainer');

    const totalPastCountEl = document.getElementById('totalPastCount');
    const leftCountEl = document.getElementById('leftCount');
    const removedCountEl = document.getElementById('removedCount');

    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportVcfBtn = document.getElementById('exportVcfBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const copyNumbersBtn = document.getElementById('copyNumbersBtn');

    const filterChips = document.querySelectorAll('.chip');
    const statCards = document.querySelectorAll('.stat-card');

    let pastContacts = [];
    let currentGroupName = "WhatsApp Group";
    let activeFilter = "all";
    let searchQuery = "";

    checkActiveTab();

    async function checkActiveTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url || !tab.url.includes("web.whatsapp.com")) {
                connectionStatus.textContent = "Offline";
                connectionStatus.style.color = "#f87171";
                groupTitle.textContent = "Please open web.whatsapp.com";
                startExtractBtn.disabled = true;
                startExtractBtn.textContent = "Open WhatsApp Web First";
                return false;
            } else {
                connectionStatus.textContent = "Connected";
                return true;
            }
        } catch (e) {
            return false;
        }
    }

    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "PROGRESS_UPDATE") {
            if (message.status) progressText.textContent = message.status;
            if (message.pct) progressBar.style.width = `${message.pct}%`;
        }
    });

    async function triggerExtraction() {
        welcomeState.style.display = "none";
        resultsState.style.display = "none";
        progressState.style.display = "flex";
        progressText.textContent = "Scanning Member changes...";
        progressBar.style.width = "20%";

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error("No active tab found");

            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['export-utils.js', 'content.js']
            }).catch(() => {});

            chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_PAST_MEMBERS" }, (response) => {
                progressState.style.display = "none";

                if (chrome.runtime.lastError) {
                    alert("Error: " + chrome.runtime.lastError.message + "\nPlease click into the group on web.whatsapp.com.");
                    welcomeState.style.display = "flex";
                    return;
                }

                if (response && response.success) {
                    pastContacts = response.contacts || [];
                    currentGroupName = response.groupName || "WhatsApp Group";
                    groupTitle.textContent = currentGroupName + " (Past Members)";

                    if (pastContacts.length === 0) {
                        alert("No past members found in this group's Member changes!");
                        welcomeState.style.display = "flex";
                        return;
                    }

                    renderResults();
                } else {
                    alert("Extraction failed: " + (response?.error || "Unknown error"));
                    welcomeState.style.display = "flex";
                }
            });
        } catch (err) {
            progressState.style.display = "none";
            welcomeState.style.display = "flex";
            alert("Error: " + err.message);
        }
    }

    startExtractBtn.addEventListener('click', triggerExtraction);
    reScanBtn.addEventListener('click', triggerExtraction);

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.getAttribute('data-filter');
            applyFiltersAndRender();
        });
    });

    statCards.forEach(card => {
        card.addEventListener('click', () => {
            const filter = card.getAttribute('data-filter');
            if (!filter) return;
            filterChips.forEach(c => {
                if (c.getAttribute('data-filter') === filter) c.click();
            });
        });
    });

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        applyFiltersAndRender();
    });

    function renderResults() {
        const total = pastContacts.length;
        const left = pastContacts.filter(c => c.action.includes("Left")).length;
        const removed = pastContacts.filter(c => c.action.includes("removed")).length;

        totalPastCountEl.textContent = total;
        leftCountEl.textContent = left;
        removedCountEl.textContent = removed;

        resultsState.style.display = "block";
        applyFiltersAndRender();
    }

    function applyFiltersAndRender() {
        let filtered = pastContacts.filter(c => {
            if (activeFilter === "left" && !c.action.includes("Left")) return false;
            if (activeFilter === "removed" && !c.action.includes("removed")) return false;

            if (searchQuery) {
                const combined = `${c.phone} ${c.action} ${c.time} ${c.country}`.toLowerCase();
                return combined.includes(searchQuery);
            }
            return true;
        });

        contactListContainer.innerHTML = "";

        if (filtered.length === 0) {
            contactListContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b; font-size:12px;">No past members matched filter.</div>`;
            return;
        }

        filtered.forEach(c => {
            const row = document.createElement("div");
            row.className = "contact-row";

            const isRemoved = c.action.includes("removed");
            const tagClass = isRemoved ? "tag-removed" : "tag-left";
            const tagText = isRemoved ? "Was Removed" : "Left Group";

            row.innerHTML = `
                <div>
                    <div class="contact-phone">${c.flag || '🌐'} ${c.phone}</div>
                    <div class="contact-time">${escapeHTML(c.time || 'Recent')}</div>
                </div>
                <div>
                    <span class="tag-action ${tagClass}">${tagText}</span>
                </div>
            `;
            contactListContainer.appendChild(row);
        });
    }

    function escapeHTML(str) {
        return String(str || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }

    exportCsvBtn.addEventListener('click', () => {
        if (!pastContacts.length) return;
        const csv = window.WAPastExtractorUtils.generateCSV(pastContacts, currentGroupName);
        window.WAPastExtractorUtils.downloadFile(csv, `${sanitizeName(currentGroupName)}_past_members.csv`, "text/csv;charset=utf-8");
    });

    exportVcfBtn.addEventListener('click', () => {
        if (!pastContacts.length) return;
        const vcf = window.WAPastExtractorUtils.generateVCF(pastContacts, currentGroupName);
        window.WAPastExtractorUtils.downloadFile(vcf, `${sanitizeName(currentGroupName)}_past_members.vcf`, "text/vcard;charset=utf-8");
    });

    exportExcelBtn.addEventListener('click', () => {
        if (!pastContacts.length) return;
        const xml = window.WAPastExtractorUtils.generateExcelXML(pastContacts, currentGroupName);
        window.WAPastExtractorUtils.downloadFile(xml, `${sanitizeName(currentGroupName)}_past_members.xls`, "application/vnd.ms-excel;charset=utf-8");
    });

    copyNumbersBtn.addEventListener('click', () => {
        if (!pastContacts.length) return;
        const text = pastContacts.map(c => c.phone).join('\n');
        navigator.clipboard.writeText(text).then(() => {
            const orig = copyNumbersBtn.textContent;
            copyNumbersBtn.textContent = `✓ Copied ${pastContacts.length} Numbers!`;
            setTimeout(() => { copyNumbersBtn.textContent = orig; }, 1800);
        });
    });

    function sanitizeName(name) {
        return (name || 'whatsapp').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    }
});
