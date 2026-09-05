/**
 * WhatsApp Contact Studio & Extractor Dashboard - App Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Demo Sample Dataset
    const DEMO_CONTACTS = [
        { name: "Alex Rivera", phone: "+1 202 555 0143", digitsOnly: "12025550143", country: "United States / Canada", flag: "🇺🇸/🇨🇦", status: "Active Member", role: "Group Creator", isAdmin: true, isSuperAdmin: true, isPast: false, leaveDate: "", leaveReason: "" },
        { name: "Sarah Jenkins", phone: "+44 7911 123456", digitsOnly: "447911123456", country: "United Kingdom", flag: "🇬🇧", status: "Active Member", role: "Admin", isAdmin: true, isSuperAdmin: false, isPast: false, leaveDate: "", leaveReason: "" },
        { name: "Rajesh Kumar", phone: "+91 98765 43210", digitsOnly: "919876543210", country: "India", flag: "🇮🇳", status: "Active Member", role: "Member", isAdmin: false, isSuperAdmin: false, isPast: false, leaveDate: "", leaveReason: "" },
        { name: "Priya Sharma", phone: "+91 91234 56789", digitsOnly: "919123456789", country: "India", flag: "🇮🇳", status: "Active Member", role: "Member", isAdmin: false, isSuperAdmin: false, isPast: false, leaveDate: "", leaveReason: "" },
        { name: "Carlos Mendes", phone: "+55 11 98765 4321", digitsOnly: "5511987654321", country: "Brazil", flag: "🇧🇷", status: "Active Member", role: "Member", isAdmin: false, isSuperAdmin: false, isPast: false, leaveDate: "", leaveReason: "" },
        { name: "Fatima Al-Mansoor", phone: "+971 50 123 4567", digitsOnly: "971501234567", country: "United Arab Emirates", flag: "🇦🇪", status: "Active Member", role: "Member", isAdmin: false, isSuperAdmin: false, isPast: false, leaveDate: "", leaveReason: "" },
        { name: "Michael Schmidt", phone: "+49 151 23456789", digitsOnly: "4915123456789", country: "Germany", flag: "🇩🇪", status: "Past Member", role: "Past Member", isAdmin: false, isSuperAdmin: false, isPast: true, leaveDate: "2026-08-20 14:22", leaveReason: "Left group voluntarily" },
        { name: "Elena Rostova", phone: "+7 912 345-67-89", digitsOnly: "79123456789", country: "Russia / Kazakhstan", flag: "🇷🇺", status: "Past Member", role: "Past Member", isAdmin: false, isSuperAdmin: false, isPast: true, leaveDate: "2026-08-22 09:15", leaveReason: "Removed by Admin" },
        { name: "Liam O'Connor", phone: "+353 87 123 4567", digitsOnly: "353871234567", country: "Ireland", flag: "🇮🇪", status: "Past Member", role: "Past Member", isAdmin: false, isSuperAdmin: false, isPast: true, leaveDate: "2026-08-25 18:40", leaveReason: "Left group voluntarily" },
        { name: "Kenji Sato", phone: "+81 90 1234 5678", digitsOnly: "819012345678", country: "Japan", flag: "🇯🇵", status: "Active Member", role: "Member", isAdmin: false, isSuperAdmin: false, isPast: false, leaveDate: "", leaveReason: "" }
    ];

    let currentGroup = "Global VIP Community";
    let contacts = [...DEMO_CONTACTS];
    let selectedIndices = new Set(contacts.map((_, i) => i));
    let activeFilter = "all";
    let searchQuery = "";

    // DOM Elements
    const headerGroupName = document.getElementById('headerGroupName');
    const metricTotal = document.getElementById('metricTotal');
    const metricActive = document.getElementById('metricActive');
    const metricPast = document.getElementById('metricPast');
    const metricCountries = document.getElementById('metricCountries');

    const pillAll = document.getElementById('pillAll');
    const pillActive = document.getElementById('pillActive');
    const pillPast = document.getElementById('pillPast');
    const pillAdmin = document.getElementById('pillAdmin');

    const tableSearch = document.getElementById('tableSearch');
    const contactsTbody = document.getElementById('contactsTbody');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const filterPills = document.querySelectorAll('.filter-pill');

    const exportMainBtn = document.getElementById('exportMainBtn');
    const exportMenu = document.getElementById('exportMenu');
    const exportCsv = document.getElementById('exportCsv');
    const exportVcf = document.getElementById('exportVcf');
    const exportExcel = document.getElementById('exportExcel');
    const exportJson = document.getElementById('exportJson');
    const copyAllClip = document.getElementById('copyAllClip');

    const loadDemoBtn = document.getElementById('loadDemoBtn');
    const fileInput = document.getElementById('fileInput');

    // Initialize
    updateAll();

    // Toggle Export Dropdown
    exportMainBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        exportMenu.classList.remove('show');
    });

    // Filter Pills
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeFilter = pill.getAttribute('data-filter');
            renderTable();
        });
    });

    // Search Input
    tableSearch.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderTable();
    });

    // Select All Checkbox
    selectAllCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            selectedIndices = new Set(contacts.map((_, i) => i));
        } else {
            selectedIndices.clear();
        }
        renderTable();
    });

    // Load Demo Button
    loadDemoBtn.addEventListener('click', () => {
        currentGroup = "Global VIP Community";
        contacts = [...DEMO_CONTACTS];
        selectedIndices = new Set(contacts.map((_, i) => i));
        updateAll();
    });

    // File Upload Handler (Import JSON / CSV)
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                if (file.name.endsWith('.json')) {
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed)) {
                        contacts = parsed;
                    } else if (parsed.contacts && Array.isArray(parsed.contacts)) {
                        contacts = parsed.contacts;
                        if (parsed.groupName) currentGroup = parsed.groupName;
                    }
                } else if (file.name.endsWith('.csv')) {
                    contacts = parseCSVToContacts(content);
                }

                selectedIndices = new Set(contacts.map((_, i) => i));
                updateAll();
                alert(`Successfully imported ${contacts.length} contacts!`);
            } catch (err) {
                alert("Failed to parse file: " + err.message);
            }
        };
        reader.readAsText(file);
    });

    function parseCSVToContacts(csvText) {
        const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) return [];
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
            const name = cols[0] || "";
            const phone = cols[1] || "";
            const status = cols[3] || "Active Member";
            const role = cols[4] || "Member";
            const isPast = status.includes("Past") || status.includes("Left");
            const parsed = (typeof parsePhoneNumber === 'function') ? parsePhoneNumber(phone) : { country: "International", flag: "🌐", digitsOnly: phone.replace(/\D/g, '') };

            result.push({
                name,
                phone: phone || ('+' + parsed.digitsOnly),
                digitsOnly: parsed.digitsOnly,
                status: isPast ? "Past Member" : "Active Member",
                role: role,
                isAdmin: /admin/i.test(role),
                isSuperAdmin: /creator/i.test(role),
                isPast: isPast,
                country: parsed.country || "International",
                flag: parsed.flag || "🌐",
                leaveDate: cols[6] || ""
            });
        }
        return result;
    }

    function updateAll() {
        headerGroupName.textContent = currentGroup;
        const total = contacts.length;
        const active = contacts.filter(c => !c.isPast).length;
        const past = contacts.filter(c => c.isPast).length;
        const admins = contacts.filter(c => c.isAdmin).length;
        const countries = new Set(contacts.map(c => c.country || "Unknown")).size;

        metricTotal.textContent = total;
        metricActive.textContent = active;
        metricPast.textContent = past;
        metricCountries.textContent = countries;

        pillAll.textContent = total;
        pillActive.textContent = active;
        pillPast.textContent = past;
        pillAdmin.textContent = admins;

        renderTable();
    }

    function renderTable() {
        const filtered = contacts.map((c, idx) => ({ ...c, originalIndex: idx })).filter(c => {
            if (activeFilter === "active" && c.isPast) return false;
            if (activeFilter === "past" && !c.isPast) return false;
            if (activeFilter === "admin" && !c.isAdmin) return false;

            if (searchQuery) {
                const text = `${c.name} ${c.phone} ${c.country} ${c.role} ${c.status}`.toLowerCase();
                return text.includes(searchQuery);
            }
            return true;
        });

        contactsTbody.innerHTML = "";

        if (filtered.length === 0) {
            contactsTbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:#64748b;">No contacts found matching your criteria.</td></tr>`;
            return;
        }

        filtered.forEach(c => {
            const tr = document.createElement("tr");

            let statusTag = "";
            if (c.isPast) {
                statusTag = `<span class="tag-status tag-past">🕒 Left / Removed</span>`;
            } else {
                statusTag = `<span class="tag-status tag-active">🟢 Active</span>`;
            }

            let roleTag = "";
            if (c.isAdmin) {
                roleTag = `<span class="tag-status tag-admin">${c.isSuperAdmin ? 'Creator' : 'Admin'}</span>`;
            } else {
                roleTag = `<span>${c.isPast ? 'Past Member' : 'Member'}</span>`;
            }

            const isChecked = selectedIndices.has(c.originalIndex) ? 'checked' : '';

            tr.innerHTML = `
                <td><input type="checkbox" class="row-checkbox" data-index="${c.originalIndex}" ${isChecked}></td>
                <td class="name-cell">${escapeHTML(c.name || 'Unnamed Contact')}</td>
                <td><span class="phone-badge">${c.phone || ('+' + c.digitsOnly)}</span></td>
                <td><span>${c.flag || '🌐'} ${c.country || 'International'}</span></td>
                <td>${statusTag}</td>
                <td>${roleTag}</td>
                <td style="font-size:12px; color:#94a3b8;">${c.leaveDate || (c.isPast ? 'Recently Left' : '—')}</td>
                <td style="text-align: right;">
                    <button class="btn-icon-action copy-single-btn" data-phone="${c.phone}" title="Copy Number">📋</button>
                    <button class="btn-icon-action delete-single-btn" data-index="${c.originalIndex}" title="Delete">🗑️</button>
                </td>
            `;
            contactsTbody.appendChild(tr);
        });

        // Add Listeners to row checkboxes
        contactsTbody.querySelectorAll('.row-checkbox').forEach(box => {
            box.addEventListener('change', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                if (e.target.checked) selectedIndices.add(idx);
                else selectedIndices.delete(idx);
            });
        });

        // Copy single button
        contactsTbody.querySelectorAll('.copy-single-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const phone = e.target.getAttribute('data-phone');
                navigator.clipboard.writeText(phone);
                e.target.textContent = "✓";
                setTimeout(() => { e.target.textContent = "📋"; }, 1000);
            });
        });

        // Delete single button
        contactsTbody.querySelectorAll('.delete-single-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                contacts.splice(idx, 1);
                selectedIndices = new Set(contacts.map((_, i) => i));
                updateAll();
            });
        });
    }

    function getSelectedContacts() {
        const list = contacts.filter((_, idx) => selectedIndices.has(idx));
        return list.length > 0 ? list : contacts;
    }

    // Export Actions
    exportCsv.addEventListener('click', () => {
        const list = getSelectedContacts();
        const csv = window.WAExtractorUtils.generateCSV(list, currentGroup);
        window.WAExtractorUtils.downloadFile(csv, `${currentGroup}_contacts.csv`, "text/csv;charset=utf-8");
    });

    exportVcf.addEventListener('click', () => {
        const list = getSelectedContacts();
        const vcf = window.WAExtractorUtils.generateVCF(list, currentGroup);
        window.WAExtractorUtils.downloadFile(vcf, `${currentGroup}_contacts.vcf`, "text/vcard;charset=utf-8");
    });

    exportExcel.addEventListener('click', () => {
        const list = getSelectedContacts();
        const xml = window.WAExtractorUtils.generateExcelXML(list, currentGroup);
        window.WAExtractorUtils.downloadFile(xml, `${currentGroup}_contacts.xls`, "application/vnd.ms-excel;charset=utf-8");
    });

    exportJson.addEventListener('click', () => {
        const list = getSelectedContacts();
        const payload = {
            groupName: currentGroup,
            exportedAt: new Date().toISOString(),
            contacts: list
        };
        window.WAExtractorUtils.downloadFile(JSON.stringify(payload, null, 2), `${currentGroup}_contacts.json`, "application/json;charset=utf-8");
    });

    copyAllClip.addEventListener('click', () => {
        const list = getSelectedContacts();
        const text = list.map(c => c.phone || ('+' + c.digitsOnly)).join(', ');
        navigator.clipboard.writeText(text).then(() => {
            alert(`Copied ${list.length} phone numbers to clipboard!`);
        });
    });

    function escapeHTML(str) {
        return String(str || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[m]);
    }
});
