const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:3000";
const ADMIN_EMAIL = "comfit99@naver.com";
const ADMIN_PASSWORD = "Swbin046@";
const SHOTS_DIR = path.join(__dirname, ".moai/specs/SPEC-RHYMIX-001/screenshots/tobe");
const OUT_FILE = path.join(__dirname, ".moai/specs/SPEC-RHYMIX-001/tobe-live-analysis.md");

if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });
const R = { pub: [], adm: [], nf: [], nav: [] };
async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }