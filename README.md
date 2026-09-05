# WhatsApp Past Member Extractor (Member Changes) 🕒

Exclusively extracts **past members who left or were removed from the group (from the Member Changes screen)** in WhatsApp Web.

---

## 🌟 Features

- ✅ **Member Changes Focused**: Specifically scans WhatsApp Web's `Member changes` screen (last 60 days).
- ✅ **Action & Timestamp**: Captures whether the contact was **"Removed by Admin"** or **"Left the group"**, along with exact time (`today at 5:30 PM`, `yesterday at 10:25 PM`, etc.).
- ✅ **Multi-Format Exports**:
  - **CSV**: Standard spreadsheet with columns: `Phone Number`, `Action`, `Date & Time`, `Country`, `Group Name`.
  - **vCard (VCF)**: 1-Click contact file to import all past members into your iPhone / Android Google Contacts.
  - **Excel (.xls)**: Formatted table with amber theme.
  - **Copy Phone Numbers**: Clean copy to clipboard.
- ✅ **Floating In-Page HUD**: An amber floating dock right inside WhatsApp Web.
- ✅ **Instant Console Snippet**: Run in 1 second via DevTools console without installing anything!

---

## 🚀 How to Use

### Method 1: Chrome Extension
1. Open `chrome://extensions/` and click **"Load unpacked"** (or click Reload if already loaded).
2. Select folder: `C:\Users\ujwal\.gemini\antigravity-ide\scratch\WhatsAppNumberExtractor`
3. Refresh [web.whatsapp.com](https://web.whatsapp.com) (`Ctrl + F5`).
4. Click into your group (or open **Member changes**).
5. Click **"Extract Past Members"** on the floating widget or extension popup.

### Method 2: Instant DevTools Console (1-Click)
1. In WhatsApp Web, open the group or the **Member changes** screen.
2. Press `F12` -> Click **Console**.
3. Copy and paste the contents of [`console-script.js`](./console-script.js) and press **Enter**.
4. It will immediately scroll Member changes and download your `.csv` and `.vcf` files!
