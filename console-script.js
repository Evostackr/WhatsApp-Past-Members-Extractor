/**
 * WhatsApp Past Member Extractor - 1-Click DevTools Console Script
 * 
 * Instructions:
 * 1. Open WhatsApp Web (web.whatsapp.com) and open the group (or open "Member changes" directly).
 * 2. Press F12 -> Console tab.
 * 3. Paste this script and press Enter!
 * 4. It will scroll the entire Member Changes list (last 60 days) and download CSV and VCF of all past members!
 */

(async function extractPastMembersDirect() {
    console.log("%c[WA Past Member Extractor]%c Starting Member Changes scan...", "color:#f59e0b;font-weight:bold;font-size:14px;", "color:#fff;");

    const sleep = ms => new Promise(res => setTimeout(res, ms));

    const pastMap = new Map();
    const phoneRegex = /\+?[0-9][0-9\-\s\(\)]{7,18}[0-9]/;

    let groupName = "WhatsApp Group";
    const headerEl = document.querySelector("#main header");
    if (headerEl) {
        const titleSpan = headerEl.querySelector("span[dir='auto'][title], span[title], h2");
        if (titleSpan) groupName = titleSpan.getAttribute("title") || titleSpan.textContent.trim();
    }

    function register(rawPhone, fullText, timeText) {
        if (!rawPhone) return;
        const clean = rawPhone.replace(/[^\d+]/g, '');
        const digits = clean.replace(/\D/g, '');
        if (digits.length < 8 || digits.length > 16) return;

        let action = "Left the group";
        if (/removed/i.test(fullText)) action = "Was removed by admin";
        else if (/left/i.test(fullText)) action = "Left the group";

        const formatted = clean.startsWith('+') ? clean : '+' + clean;
        const time = (timeText || "").trim() || "Recent";

        if (!pastMap.has(digits)) {
            pastMap.set(digits, {
                phone: formatted,
                digitsOnly: digits,
                action: action,
                time: time,
                groupName: groupName
            });
        }
    }

    // 1. Check if Member changes screen is already open or needs to be opened
    const isMemberChangesOpen = Array.from(document.querySelectorAll("h1, h2, span")).some(h => (h.textContent || "").includes("Member changes"));

    if (!isMemberChangesOpen) {
        console.log("%cOpening Group Info & Member changes...", "color:#38bdf8;");
        if (headerEl) {
            const clickable = headerEl.querySelector("div[role='button'], span[title]") || headerEl;
            clickable.click();
            await sleep(900);
        }

        const buttons = Array.from(document.querySelectorAll("div[role='button'], span, div[tabindex='0']"));
        const pastBtn = buttons.find(el => {
            const t = (el.textContent || "").toLowerCase();
            return t.includes("past participant") || t.includes("past member") || t.includes("member changes") || t.includes("view past");
        });

        if (pastBtn) {
            pastBtn.click();
            await sleep(1000);
        }
    }

    // 2. Find scrollable container and scroll through Member Changes
    console.log("%cScanning Member changes rows...", "color:#38bdf8;");

    const scrollContainer = document.querySelector("div[data-testid='chat-info-drawer'] div[tabindex='-1']") || 
                            document.querySelector("div[role='region'] div[tabindex='-1']") || 
                            document.querySelector("div[data-testid='chat-info-drawer']") ||
                            document.querySelector("div[role='region']");

    function scrape() {
        const rows = document.querySelectorAll("div[role='listitem'], div[role='button'], div[data-testid='cell-frame-container'], div._ak8q, div[tabindex='-1'] > div");
        rows.forEach(r => {
            const text = (r.innerText || r.textContent || "").trim();
            if (/left|removed|was removed/i.test(text)) {
                const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                const mainLine = lines[0] || text;
                const timeLine = lines[1] || "";
                const match = mainLine.match(phoneRegex) || text.match(phoneRegex);
                if (match) {
                    register(match[0], mainLine, timeLine);
                }
            }
        });
    }

    if (scrollContainer) {
        scrollContainer.scrollTop = 0;
        let lastScroll = -1;
        for (let i = 0; i < 150; i++) {
            scrape();
            scrollContainer.scrollTop += 380;
            await sleep(75);
            if (scrollContainer.scrollTop === lastScroll && i > 10) break;
            lastScroll = scrollContainer.scrollTop;
        }
    } else {
        scrape();
    }

    // 3. Scan chat message events
    document.querySelectorAll("div[data-testid='msg-container'], div.copyable-text").forEach(msg => {
        const text = (msg.innerText || msg.textContent || "").trim();
        if (/left|was removed/i.test(text)) {
            const match = text.match(phoneRegex);
            if (match) register(match[0], text, "From Chat History");
        }
    });

    const pastList = Array.from(pastMap.values());
    console.log(`%c✔ EXTRACTED ${pastList.length} PAST MEMBERS!`, "color:#f59e0b;font-weight:bold;font-size:15px;");
    console.table(pastList);

    if (pastList.length === 0) {
        console.warn("No past members found. Make sure you are viewing the 'Member changes' screen!");
        return;
    }

    // CSV
    let csv = "\uFEFFPhone Number,Action,Date & Time,Group Name\r\n";
    pastList.forEach(c => {
        csv += `"${c.phone}","${c.action}","${c.time}","${groupName}"\r\n`;
    });

    // VCF
    let vcf = "";
    pastList.forEach((c, idx) => {
        vcf += `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Past Member ${c.phone} (${c.action})\r\nTEL;TYPE=CELL:${c.phone}\r\nNOTE:Action: ${c.action} at ${c.time} in ${groupName}\r\nEND:VCARD\r\n`;
    });

    function dl(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
    }

    const safe = groupName.replace(/[^a-zA-Z0-9_-]/g, '_');
    dl(csv, `${safe}_past_members_${pastList.length}.csv`, "text/csv;charset=utf-8");
    dl(vcf, `${safe}_past_members_${pastList.length}.vcf`, "text/vcard;charset=utf-8");

    console.log("%c✔ Downloaded CSV & VCF files successfully!", "color:#10b981;font-weight:bold;");
})();
