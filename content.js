/**
 * WhatsApp Past Member Extractor - Content Script
 * Exclusively extracts past members from WhatsApp Web's "Member changes" screen and chat exit logs.
 */

(() => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    /**
     * Get active group name
     */
    function getActiveGroupName() {
        const headerEl = document.querySelector("#main header");
        if (headerEl) {
            const titleSpan = headerEl.querySelector("span[dir='auto'][title], span[title], h2, div[role='button'] span");
            if (titleSpan) {
                return titleSpan.getAttribute("title") || titleSpan.textContent.trim();
            }
        }
        return "WhatsApp Group";
    }

    /**
     * Parse phone number from string
     */
    function parsePhone(raw) {
        if (typeof window.WAPastExtractorUtils !== "undefined") {
            return window.WAPastExtractorUtils.parsePhoneNumber(raw);
        }
        let clean = String(raw || '').replace(/[^\d+]/g, '');
        if (!clean.startsWith('+')) clean = '+' + clean;
        return {
            phone: clean,
            digitsOnly: clean.replace(/\D/g, ''),
            country: "International",
            flag: "🌐"
        };
    }

    /**
     * Find Member Changes / Right Drawer Scrollable Container
     */
    function findScrollContainer() {
        const candidates = [
            document.querySelector("div[data-testid='chat-info-drawer'] div[tabindex='-1']"),
            document.querySelector("div[data-testid='chat-info-drawer']"),
            document.querySelector("div[role='region'] div[tabindex='-1']"),
            document.querySelector("div[role='region']"),
            document.querySelector("div[role='dialog'] div[tabindex='-1']"),
            document.querySelector("div[role='dialog']"),
            document.querySelector("section div[tabindex='-1']"),
            document.querySelector("section")
        ];

        for (const el of candidates) {
            if (el && (el.scrollHeight > el.clientHeight || window.getComputedStyle(el).overflowY.includes("scroll") || window.getComputedStyle(el).overflowY.includes("auto"))) {
                return el;
            }
        }
        return document.querySelector("div[data-testid='chat-info-drawer']") || document.querySelector("div[role='region']");
    }

    /**
     * Open "Member changes" screen if not already opened
     */
    async function ensureMemberChangesOpen(onProgress) {
        // Check if "Member changes" header is already visible
        const headings = Array.from(document.querySelectorAll("h1, h2, span, header"));
        const alreadyOpen = headings.some(h => (h.textContent || "").includes("Member changes") || (h.textContent || "").includes("Past participants"));
        
        if (alreadyOpen) {
            onProgress("Member changes screen detected! Starting scan...", 20);
            return true;
        }

        // Otherwise, open Group Info first
        onProgress("Opening Group Info...", 10);
        let infoSidebar = document.querySelector("div[data-testid='chat-info-drawer'], section, div[role='region']");
        const header = document.querySelector("#main header");

        if (!infoSidebar && header) {
            const clickable = header.querySelector("div[role='button'], span[title], div._amie, div._amig") || header;
            clickable.click();
            await sleep(900);
        }

        // Scroll down Group Info to find "Past participants" / "Member changes"
        onProgress("Locating 'Past participants / Member changes' button...", 20);
        const scrollEl = findScrollContainer();
        if (scrollEl) {
            scrollEl.scrollTop = scrollEl.scrollHeight;
            await sleep(300);
        }

        // Look for clickable element containing "past" or "member changes"
        const allButtons = Array.from(document.querySelectorAll("div[role='button'], span, div[tabindex='0'], button, div._ak8q"));
        const pastBtn = allButtons.find(el => {
            const t = (el.textContent || "").toLowerCase().trim();
            return (
                t.includes("past participant") || 
                t.includes("past member") || 
                t.includes("member changes") || 
                t.includes("view past") || 
                t.match(/\b\d+\s+past\b/i)
            );
        });

        if (pastBtn) {
            onProgress("Opening Member changes screen...", 30);
            pastBtn.click();
            await sleep(1000);
            return true;
        }

        return false;
    }

    /**
     * Master Past Members Scanner (Member changes + chat logs)
     */
    async function extractPastMembers(onProgress = () => {}) {
        onProgress("Preparing Past Members scanner...", 5);
        const groupName = getActiveGroupName();
        const pastMembersMap = new Map(); // digits -> past member object

        // Helper to register past member
        function registerPastMember(rawNumber, actionText, timeText, rawName = "") {
            const parsed = parsePhone(rawNumber);
            const digits = parsed.digitsOnly;

            if (!digits || digits.length < 8 || digits.length > 16) return;

            let action = "Left the group";
            if (/removed/i.test(actionText)) {
                action = "Was removed by admin";
            } else if (/left/i.test(actionText)) {
                action = "Left the group";
            }

            const cleanTime = (timeText || "").replace(/^(today at|yesterday at)/i, m => m).trim();

            if (!pastMembersMap.has(digits)) {
                pastMembersMap.set(digits, {
                    phone: parsed.phone,
                    digitsOnly: digits,
                    name: rawName || "Past Member",
                    action: action,
                    time: cleanTime || "Recent",
                    leaveDate: cleanTime || "Recent",
                    country: parsed.country,
                    flag: parsed.flag,
                    groupName: groupName
                });
            }
        }

        // 1. Ensure Member changes screen is open
        await ensureMemberChangesOpen(onProgress);

        // 2. Deep Scroll through Member Changes
        onProgress("Scanning Member changes list...", 35);
        const scrollContainer = findScrollContainer();

        const phoneRegex = /\+?[0-9][0-9\-\s\(\)]{7,18}[0-9]/;

        function scrapeVisibleRows() {
            // Find list rows in Member changes screen
            const rows = document.querySelectorAll("div[role='listitem'], div[role='button'], div[data-testid='cell-frame-container'], div._ak8q, div._ak72, div[tabindex='-1'] > div");
            
            rows.forEach(row => {
                const fullText = (row.innerText || row.textContent || "").trim();
                if (!fullText) return;

                // Look for patterns like:
                // "+91 91377 22318 was removed\ntoday at 5:30 PM"
                // "+91 70130 44138 left the group\ntoday at 5:33 AM"
                if (/left|removed|was removed/i.test(fullText)) {
                    const lines = fullText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                    
                    let mainLine = lines[0] || fullText;
                    let timeLine = lines[1] || "";

                    const phoneMatch = mainLine.match(phoneRegex) || fullText.match(phoneRegex);
                    if (phoneMatch) {
                        const rawPhone = phoneMatch[0];
                        registerPastMember(rawPhone, mainLine, timeLine);
                    }
                }
            });
        }

        if (scrollContainer) {
            scrollContainer.scrollTop = 0;
            await sleep(200);

            let lastScrollTop = -1;
            let idleCount = 0;

            for (let i = 0; i < 150; i++) {
                scrapeVisibleRows();
                scrollContainer.scrollTop += 380;
                await sleep(80);

                const curr = scrollContainer.scrollTop;
                if (curr === lastScrollTop) {
                    idleCount++;
                    if (idleCount >= 4) break; // Reached end of 60 days list
                } else {
                    idleCount = 0;
                }
                lastScrollTop = curr;

                if (i % 6 === 0) {
                    const pct = Math.min(85, Math.round(35 + (i / 150) * 50));
                    onProgress(`Scanned ${pastMembersMap.size} past members...`, pct);
                }
            }
        } else {
            scrapeVisibleRows();
        }

        // 3. Also scan Chat Messages Timeline for any older exit events
        onProgress("Checking chat history for any additional past members...", 90);
        const chatMsgs = document.querySelectorAll("div[data-testid='msg-container'], div.copyable-text, div[role='row'], div._akbu");
        chatMsgs.forEach(msg => {
            const text = (msg.innerText || msg.textContent || "").trim();
            if (/left|was removed/i.test(text)) {
                const match = text.match(phoneRegex);
                if (match) {
                    registerPastMember(match[0], text, "From Chat History");
                }
            }
        });

        onProgress(`Finished! Extracted ${pastMembersMap.size} past members.`, 100);

        const list = Array.from(pastMembersMap.values());
        return {
            success: true,
            groupName: groupName,
            totalPast: list.length,
            removedCount: list.filter(c => c.action.includes("removed")).length,
            leftCount: list.filter(c => c.action.includes("Left")).length,
            contacts: list
        };
    }

    /**
     * Message Listener for Extension Popup
     */
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "EXTRACT_PAST_MEMBERS") {
            extractPastMembers((status, pct) => {
                try {
                    chrome.runtime.sendMessage({
                        action: "PROGRESS_UPDATE",
                        status,
                        pct
                    });
                } catch (e) {}
            }).then(result => {
                sendResponse(result);
            }).catch(err => {
                sendResponse({ success: false, error: err.message });
            });
            return true;
        }

        if (request.action === "PING") {
            sendResponse({ success: true, url: window.location.href });
            return true;
        }
    });

    /**
     * In-Page Floating Quick Action Dock
     */
    function createFloatingDock() {
        if (document.getElementById("wa-past-extractor-dock")) return;

        const dock = document.createElement("div");
        dock.id = "wa-past-extractor-dock";
        dock.innerHTML = `
            <div class="wa-past-dock-header">
                <div class="wa-past-dock-title">
                    <span class="wa-past-dock-badge">🕒 PAST</span> Member Extractor
                </div>
                <button class="wa-past-dock-min" id="wa-past-dock-min">✕</button>
            </div>
            <div class="wa-past-dock-body">
                <p class="wa-past-dock-desc">Extract all members who <b>Left</b> or were <b>Removed</b> (Member Changes).</p>
                <button class="wa-past-dock-btn" id="wa-past-dock-btn">
                    <span>⚡</span> Extract Past Members
                </button>
                <div id="wa-past-dock-status" class="wa-past-dock-status" style="display:none;"></div>
                <div id="wa-past-dock-stats" class="wa-past-dock-stats" style="display:none;">
                    <div class="wa-stat-badge">Total Past: <b id="wa-past-dock-total">0</b></div>
                    <div class="wa-stat-badge left">Left: <b id="wa-past-dock-left">0</b></div>
                    <div class="wa-stat-badge removed">Removed: <b id="wa-past-dock-removed">0</b></div>
                </div>
                <div id="wa-past-dock-actions" class="wa-past-dock-actions" style="display:none;">
                    <button class="wa-subbtn" id="wa-past-csv-btn">📄 CSV</button>
                    <button class="wa-subbtn" id="wa-past-vcf-btn">📇 VCF (Phone)</button>
                    <button class="wa-subbtn" id="wa-past-copy-btn">📋 Copy</button>
                </div>
            </div>
        `;

        const style = document.createElement("style");
        style.textContent = `
            #wa-past-extractor-dock {
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 999999;
                width: 290px;
                background: rgba(15, 23, 42, 0.96);
                backdrop-filter: blur(14px);
                border: 1px solid rgba(245, 158, 11, 0.4);
                border-radius: 14px;
                box-shadow: 0 12px 35px rgba(0, 0, 0, 0.6), 0 0 20px rgba(245, 158, 11, 0.2);
                color: #f1f5f9;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                overflow: hidden;
            }
            .wa-past-dock-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 14px;
                background: rgba(245, 158, 11, 0.15);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            }
            .wa-past-dock-title {
                font-size: 13px;
                font-weight: 700;
                color: #fbbf24;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .wa-past-dock-badge {
                background: #f59e0b;
                color: #451a03;
                font-size: 10px;
                font-weight: 800;
                padding: 2px 6px;
                border-radius: 4px;
            }
            .wa-past-dock-min {
                background: transparent;
                border: none;
                color: #94a3b8;
                cursor: pointer;
                font-size: 13px;
            }
            .wa-past-dock-body { padding: 12px 14px; }
            .wa-past-dock-desc { font-size: 11px; color: #94a3b8; margin-bottom: 10px; line-height: 1.4; }
            .wa-past-dock-desc b { color: #f1f5f9; }
            .wa-past-dock-btn {
                width: 100%;
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: #451a03;
                border: none;
                border-radius: 8px;
                padding: 10px 12px;
                font-size: 12.5px;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
                transition: transform 0.15s;
            }
            .wa-past-dock-btn:hover { transform: translateY(-1px); }
            .wa-past-dock-status {
                margin-top: 10px;
                font-size: 11px;
                color: #fbbf24;
                background: rgba(245, 158, 11, 0.12);
                border: 1px solid rgba(245, 158, 11, 0.25);
                border-radius: 6px;
                padding: 8px;
                text-align: center;
            }
            .wa-past-dock-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 4px;
                margin-top: 10px;
            }
            .wa-stat-badge {
                background: rgba(255, 255, 255, 0.06);
                padding: 6px 4px;
                border-radius: 6px;
                font-size: 10px;
                color: #cbd5e1;
                text-align: center;
            }
            .wa-stat-badge b { display: block; font-size: 13px; color: #fbbf24; }
            .wa-stat-badge.left b { color: #38bdf8; }
            .wa-stat-badge.removed b { color: #f87171; }
            .wa-past-dock-actions {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 6px;
                margin-top: 10px;
            }
            .wa-subbtn {
                background: rgba(255, 255, 255, 0.08);
                border: 1px solid rgba(255, 255, 255, 0.12);
                color: #f1f5f9;
                border-radius: 6px;
                padding: 7px 4px;
                font-size: 10.5px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }
            .wa-subbtn:hover { background: rgba(245, 158, 11, 0.25); border-color: #f59e0b; }
        `;

        document.head.appendChild(style);
        document.body.appendChild(dock);

        let latestContacts = [];
        let groupName = "WhatsApp Group";

        const runBtn = dock.querySelector("#wa-past-dock-btn");
        const statusEl = dock.querySelector("#wa-past-dock-status");
        const statsEl = dock.querySelector("#wa-past-dock-stats");
        const actionsEl = dock.querySelector("#wa-past-dock-actions");
        const minBtn = dock.querySelector("#wa-past-dock-min");

        minBtn.addEventListener("click", () => dock.remove());

        runBtn.addEventListener("click", async () => {
            runBtn.disabled = true;
            statusEl.style.display = "block";
            statsEl.style.display = "none";
            actionsEl.style.display = "none";

            try {
                const res = await extractPastMembers((msg) => {
                    statusEl.textContent = msg;
                });

                latestContacts = res.contacts || [];
                groupName = res.groupName || "WhatsApp Group";

                dock.querySelector("#wa-past-dock-total").textContent = res.totalPast || 0;
                dock.querySelector("#wa-past-dock-left").textContent = res.leftCount || 0;
                dock.querySelector("#wa-past-dock-removed").textContent = res.removedCount || 0;

                statusEl.textContent = `Extracted ${latestContacts.length} Past Members!`;
                statsEl.style.display = "grid";
                actionsEl.style.display = "grid";
            } catch (e) {
                statusEl.textContent = "Error: " + e.message;
            } finally {
                runBtn.disabled = false;
            }
        });

        dock.querySelector("#wa-past-csv-btn").addEventListener("click", () => {
            if (!latestContacts.length) return;
            const csv = window.WAPastExtractorUtils.generateCSV(latestContacts, groupName);
            window.WAPastExtractorUtils.downloadFile(csv, `${groupName}_past_members.csv`, "text/csv;charset=utf-8");
        });

        dock.querySelector("#wa-past-vcf-btn").addEventListener("click", () => {
            if (!latestContacts.length) return;
            const vcf = window.WAPastExtractorUtils.generateVCF(latestContacts, groupName);
            window.WAPastExtractorUtils.downloadFile(vcf, `${groupName}_past_members.vcf`, "text/vcard;charset=utf-8");
        });

        dock.querySelector("#wa-past-copy-btn").addEventListener("click", () => {
            if (!latestContacts.length) return;
            const text = latestContacts.map(c => c.phone).join("\n");
            navigator.clipboard.writeText(text);
            const btn = dock.querySelector("#wa-past-copy-btn");
            btn.textContent = "✓ Copied!";
            setTimeout(() => { btn.textContent = "📋 Copy"; }, 1500);
        });
    }

    setTimeout(createFloatingDock, 1500);
})();
