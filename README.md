# 🔍 TruthLens — AI-Powered News Fact-Checker Platform

**TruthLens** is an open-access, production-ready AI News Fact-Checker and Media Intelligence Web Application. Built on a strict **source-first verification philosophy**, TruthLens empowers users to verify claims, article URLs, raw text, and images without creating an account or risking their privacy.

---

## 🌟 Core Feature Highlights

- **Multi-Modal Verification Console**:
  - **URL Check**: Scrapes news URLs and cross-examines key claims against indexed wire repositories.
  - **Text / Claim Check**: Extracts entities, detects core assertions, and evaluates multi-source corroboration or refutation.
  - **Image Forensics**: Parses EXIF metadata provenance, runs Error Level Analysis (ELA) compression gradient anomaly checks, and estimates synthetic AI generation probability.
- **Stage-Based Animated Progress**: Visual verification sequence tracking claim extraction, FactDB query, source graph matching, and confidence calculation.
- **Explainable Result Dashboard**:
  - Verdicts: `TRUE`, `MOSTLY TRUE`, `PARTLY TRUE`, `MISLEADING`, `FALSE`, `UNVERIFIED`, `SATIRE`, `INSUFFICIENT EVIDENCE`.
  - Confidence Gauge & Evidence Strength Rating.
  - Corroborating Primary Evidence Cards with direct links and reliability scores.
  - Transparent Contradictory Evidence & Official Rebuttals.
  - 1-Click Copy Report & Print/Export PDF.
- **Live News Feeds**:
  - **World News Wire**: Breaking international journalism categorized by Politics, Technology, Health, Economy, Climate, and Science.
  - **India National & Regional Wire**: Focused reporting from national wires with instant "1-Click Verify" actions.
  - **News Ticker**: Continuous real-time headline ticker.
- **Fact Investigations (Magazine)**: Deep-dive investigative dossiers exposing disinformation pipelines and voice-cloning schemes.
- **Multilingual Support**: Instant toggle between **English** and **Hindi (हिंदी)** across all UI elements, explanations, and error messages.
- **Light / Dark Mode**: Modern dark-slate aesthetic with frosted-glass panels, emerald accents, and high-contrast accessibility.
- **Local Privacy History**: Session-based verification history saved securely in local storage.
- **Admin Intelligence Portal**:
  - Password & JWT-protected administration dashboard.
  - Analytics & Visual Charts (7-day verification volume, verdict breakdown).
  - Raw Fact Data CRUD with filtering, searching, and CSV export.
  - Investigation Article Publishing & Editor.
  - Security & Audit Event Logs.
  - System Thresholds & Provider Matrix Configurator.

---

## 🏗️ Technical Architecture

```text
                               ┌────────────────────────┐
                               │   React 19 + Vite UI   │
                               │ (Tailwind CSS, Lucide) │
                               └───────────┬────────────┘
                                           │ HTTP/REST
                               ┌───────────▼────────────┐
                               │   FastAPI Gateway      │
                               │ (Rate Limiting, Auth)  │
                               └───────────┬────────────┘
                                           │
         ┌───────────────────┬─────────────┴────────────┬──────────────────┐
         │                   │                          │                  │
┌────────▼────────┐ ┌────────▼────────┐        ┌────────▼────────┐┌────────▼────────┐
│  FactDatabase   │ │  NewsProvider   │        │   AIProvider    ││ ImageForensics  │
│(Firestore/Local)│ │(NewsAPI/Cache)  │        │(Gemini/Reason)  ││ (Pillow / ELA)  │
└─────────────────┘ └─────────────────┘        └─────────────────┘└─────────────────┘
```

---

## 📁 Repository Structure

```text
d:\news\
├── backend/
│   ├── app/
│   │   ├── api/             # REST Endpoints (fact-check, news, articles, admin)
│   │   ├── core/            # App settings, JWT & security helpers
│   │   ├── providers/       # Modular provider implementations (News, AI, Search, Image, FactDB)
│   │   ├── schemas/         # Pydantic data validation schemas
│   │   ├── services/        # Business logic & pipeline orchestrators
│   │   └── main.py          # FastAPI application entrypoint
│   ├── data/
│   │   └── database.json    # Persistent JSON storage with verified seed data
│   ├── tests/
│   │   └── test_api.py      # Integration and unit test suite
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components & views
│   │   ├── context/         # React Context for global state & i18n
│   │   ├── services/        # Fetch API client
│   │   ├── utils/           # English & Hindi translation dictionaries
│   │   ├── App.jsx          # Main application wrapper
│   │   ├── main.jsx
│   │   └── index.css        # Tailwind styles & glassmorphism utilities
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.js
│
├── firebase/
│   ├── firestore.rules      # Production security rules
│   ├── firestore.indexes.json # Composite indexes
│   └── seed/
│       └── seed_data.py     # Database seeder script
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Documentation: `http://localhost:8000/api/docs`
- Health Check: `http://localhost:8000/api/health`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- The frontend will launch at: `http://localhost:5173`

---

## 🔐 Admin Portal Access

Click the subtle lock icon (`🔒`) in the top right navigation bar to log into the Admin Suite.

- **Admin Credentials**: Configured securely via your `.env` file (`ADMIN_EMAIL` and `ADMIN_PASSWORD`).
- **Default Setup**: Copy `.env.example` to `.env` and set your preferred administrative email and secure password before launching.

---

## 🧪 Running Automated Tests

Run the complete backend test suite:
```bash
pytest backend/tests/test_api.py -v
```

---

## 🛡️ Product Principles & Ethics

1. **Evidence First**: AI never invents facts, statistics, or quotes. Every verdict requires corroborating evidence.
2. **Handle Uncertainty Gracefully**: If reliable records do not exist, the platform explicitly classifies claims as `UNVERIFIED` / `INSUFFICIENT EVIDENCE`.
3. **Expose Disagreements**: When credible sources conflict, both supporting and contradictory findings are highlighted.

