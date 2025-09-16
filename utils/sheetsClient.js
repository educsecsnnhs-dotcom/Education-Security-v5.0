// utils/sheetsClient.js
// Provides getSheetValues and appendToSheet. Uses Google Sheets if GOOGLE_APPLICATION_CREDENTIALS is set and valid.
// Otherwise falls back to writing CSV files under /exports/ for append, and returns empty arrays for reads.

const fs = require("fs");
const path = require("path");

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
let useGoogle = false;
let sheets = null;

if (keyPath) {
  try {
    const { google } = require("googleapis");
    const credentials = JSON.parse(fs.readFileSync(path.resolve(keyPath), "utf8"));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    sheets = google.sheets({ version: "v4", auth });
    useGoogle = true;
    console.log("sheetsClient: Using Google Sheets API");
  } catch (err) {
    console.warn("sheetsClient: Google Sheets init failed, falling back to CSV. Error:", err.message);
    useGoogle = false;
  }
} else {
  console.log("sheetsClient: GOOGLE_APPLICATION_CREDENTIALS not set — using CSV fallback");
}

const exportsDir = path.join(__dirname, "..", "exports");
fs.mkdirSync(exportsDir, { recursive: true });

async function appendToSheet(spreadsheetId, range, values) {
  // values: array of arrays (rows)
  if (useGoogle && sheets) {
    try {
      const res = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: "RAW",
        resource: { values },
      });
      return res.data;
    } catch (err) {
      console.warn("sheetsClient: Google append failed, falling back to CSV:", err.message);
      // fall through to CSV fallback
    }
  }
  // CSV fallback: write rows to file named by spreadsheetId and sanitized range
  const safeRange = range.replace(/[^a-z0-9_\-]/gi, "_").slice(0, 120);
  const file = path.join(exportsDir, `${spreadsheetId}-${safeRange}.csv`);
  const rows = values.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n") + "\n";
  fs.appendFileSync(file, rows, "utf8");
  return { fallback: true, file };
}

async function getSheetValues(spreadsheetId, range) {
  if (useGoogle && sheets) {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
      return res.data.values || [];
    } catch (err) {
      console.warn("sheetsClient: Google getValues failed:", err.message);
      return [];
    }
  }
  // CSV fallback: try to read corresponding CSV (may not exist)
  const safeRange = range.replace(/[^a-z0-9_\-]/gi, "_").slice(0, 120);
  const file = path.join(exportsDir, `${spreadsheetId}-${safeRange}.csv`);
  if (!fs.existsSync(file)) return [];
  const txt = fs.readFileSync(file, "utf8").trim();
  if (!txt) return [];
  return txt.split("\n").map(line => {
    // naive CSV parse for simple values
    return line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, "").replace(/""/g, '"'));
  });
}

module.exports = { appendToSheet, getSheetValues, useGoogle };

