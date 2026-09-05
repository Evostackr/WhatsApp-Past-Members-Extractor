/**
 * WhatsApp Past Member Extractor - Export & Phone Parsing Utilities
 */

const COUNTRY_CODES = [
    { code: "1", country: "United States / Canada", flag: "🇺🇸" },
    { code: "7", country: "Russia / Kazakhstan", flag: "🇷🇺" },
    { code: "20", country: "Egypt", flag: "🇪🇬" },
    { code: "27", country: "South Africa", flag: "🇿🇦" },
    { code: "31", country: "Netherlands", flag: "🇳🇱" },
    { code: "33", country: "France", flag: "🇫🇷" },
    { code: "34", country: "Spain", flag: "🇪🇸" },
    { code: "39", country: "Italy", flag: "🇮🇹" },
    { code: "44", country: "United Kingdom", flag: "🇬🇧" },
    { code: "49", country: "Germany", flag: "🇩🇪" },
    { code: "55", country: "Brazil", flag: "🇧🇷" },
    { code: "61", country: "Australia", flag: "🇦🇺" },
    { code: "62", country: "Indonesia", flag: "🇮🇩" },
    { code: "65", country: "Singapore", flag: "🇸🇬" },
    { code: "81", country: "Japan", flag: "🇯🇵" },
    { code: "86", country: "China", flag: "🇨🇳" },
    { code: "90", country: "Turkey", flag: "🇹🇷" },
    { code: "91", country: "India", flag: "🇮🇳" },
    { code: "92", country: "Pakistan", flag: "🇵🇰" },
    { code: "94", country: "Sri Lanka", flag: "🇱🇰" },
    { code: "971", country: "United Arab Emirates", flag: "🇦🇪" },
    { code: "966", country: "Saudi Arabia", flag: "🇸🇦" },
    { code: "880", country: "Bangladesh", flag: "🇧🇩" },
    { code: "977", country: "Nepal", flag: "🇳🇵" }
].sort((a, b) => b.code.length - a.code.length);

function parsePhoneNumber(rawInput) {
    if (!rawInput) return { phone: "", digitsOnly: "", country: "Unknown", flag: "🌐" };
    
    let clean = String(rawInput).split('@')[0].split(':')[0].replace(/[^\d+]/g, '');
    if (!clean.startsWith('+')) clean = '+' + clean;
    const digitsOnly = clean.replace(/\D/g, '');
    
    let matchedCountry = { country: "International", flag: "🌐", code: "" };
    for (const c of COUNTRY_CODES) {
        if (digitsOnly.startsWith(c.code)) {
            matchedCountry = c;
            break;
        }
    }
    
    return {
        phone: clean,
        digitsOnly: digitsOnly,
        country: matchedCountry.country,
        flag: matchedCountry.flag
    };
}

/**
 * Generate CSV for Past Members (Member Changes)
 */
function generateCSV(contacts, groupName = "WhatsApp Group") {
    const headers = [
        "Phone Number",
        "Name / Saved Contact",
        "Action (Left / Removed)",
        "Exit Date & Time",
        "Country",
        "Digits Only",
        "Group Name",
        "Extracted At"
    ];
    
    const rows = contacts.map(c => {
        const escape = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
        return [
            escape(c.phone),
            escape(c.name || "Past Member"),
            escape(c.action || "Left the group"),
            escape(c.time || c.leaveDate || ""),
            escape(c.country || "Unknown"),
            escape(c.digitsOnly || ""),
            escape(groupName),
            escape(new Date().toLocaleString())
        ].join(",");
    });
    
    return "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
}

/**
 * Generate vCard 3.0 (VCF) for Past Members
 */
function generateVCF(contacts, groupName = "Past Members") {
    const cleanGroup = (groupName || "WA Group").replace(/[^\w\s-]/g, '').trim();
    let vcfString = "";
    
    contacts.forEach((c, idx) => {
        const name = c.name ? `${c.name} [Past Member]` : `Past Member ${cleanGroup} ${idx + 1}`;
        const phone = c.phone || ("+" + (c.digitsOnly || ""));
        const note = `Group: ${groupName} | Action: ${c.action || 'Left / Removed'} | Time: ${c.time || c.leaveDate || 'Recent'}`;
        
        vcfString += "BEGIN:VCARD\r\n";
        vcfString += "VERSION:3.0\r\n";
        vcfString += `FN:${name}\r\n`;
        vcfString += `TEL;TYPE=CELL,VOICE:${phone}\r\n`;
        vcfString += `CATEGORIES:Past Members,${cleanGroup}\r\n`;
        vcfString += `NOTE:${note}\r\n`;
        vcfString += "END:VCARD\r\n";
    });
    
    return vcfString;
}

/**
 * Generate Excel XML Spreadsheet
 */
function generateExcelXML(contacts, groupName = "Past Members") {
    const escapeXML = (str) => String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    let rowsXML = `
        <Row ss:StyleID="HeaderStyle">
            <Cell><Data ss:Type="String">Phone Number</Data></Cell>
            <Cell><Data ss:Type="String">Name / Contact</Data></Cell>
            <Cell><Data ss:Type="String">Action</Data></Cell>
            <Cell><Data ss:Type="String">Date &amp; Time</Data></Cell>
            <Cell><Data ss:Type="String">Country</Data></Cell>
            <Cell><Data ss:Type="String">Group Name</Data></Cell>
        </Row>
    `;

    contacts.forEach(c => {
        rowsXML += `
            <Row>
                <Cell><Data ss:Type="String">${escapeXML(c.phone || "")}</Data></Cell>
                <Cell><Data ss:Type="String">${escapeXML(c.name || "Past Member")}</Data></Cell>
                <Cell><Data ss:Type="String">${escapeXML(c.action || "Left the group")}</Data></Cell>
                <Cell><Data ss:Type="String">${escapeXML(c.time || c.leaveDate || "")}</Data></Cell>
                <Cell><Data ss:Type="String">${escapeXML(c.country || "Unknown")}</Data></Cell>
                <Cell><Data ss:Type="String">${escapeXML(groupName)}</Data></Cell>
            </Row>
        `;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
     xmlns:o="urn:schemas-microsoft-com:office:office"
     xmlns:x="urn:schemas-microsoft-com:office:excel"
     xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
     <Styles>
      <Style ss:ID="HeaderStyle">
       <Font ss:Bold="1" ss:Color="#FFFFFF"/>
       <Interior ss:Color="#F59E0B" ss:Pattern="Solid"/>
       <Alignment ss:Horizontal="Center"/>
      </Style>
     </Styles>
     <Worksheet ss:Name="Past Members">
      <Table>
       ${rowsXML}
      </Table>
     </Worksheet>
    </Workbook>`;
}

function downloadFile(content, fileName, mimeType = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 200);
}

if (typeof window !== "undefined") {
    window.WAPastExtractorUtils = {
        parsePhoneNumber,
        generateCSV,
        generateVCF,
        generateExcelXML,
        downloadFile
    };
}
