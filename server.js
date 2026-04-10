const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const PLANNER_FILE = path.join(__dirname, 'data', 'planner.json');
const STOPS_FILE   = path.join(__dirname, 'data', 'stops.json');

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function readJSON(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return fallback; }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ── API routes (must be before static) ──
app.get('/api/stops', (req, res) => {
  res.json(readJSON(STOPS_FILE, { attractions: [], packs: {} }));
});

app.get('/api/planner', (req, res) => {
  res.json(readJSON(PLANNER_FILE, { selectedPlaces: [], addedPacks: {} }));
});

app.put('/api/planner', (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid data' });
  }
  writeJSON(PLANNER_FILE, data);
  res.json({ ok: true });
});

// ── Static files (after API routes) ──
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Planner server running at http://localhost:${PORT}`);
  console.log(`Open: http://localhost:${PORT}/planner.html`);
});
