# HospitalAI — Intelligent Staff Attendance & Workforce Monitoring

> **“AI-powered attendance. Real-time workforce visibility.”**

HospitalAI is an enterprise-grade, full-stack hospital workforce management web application designed for high-throughput, contactless biometric staff attendance monitoring using real-time computer vision face recognition, instant verification telemetry, and intelligent AI workforce analytics.

---

## 🏥 Architecture Overview

```
                      [ Live Camera Feed (WebRTC) ]
                                    ↓
                       [ Face Detection Canvas CV ]
                                    ↓
                       [ Face Alignment (128x128) ]
                                    ↓
                [ Histogram Equalization & HOG Descriptors ]
                                    ↓
                  [ 128-d Normalized Embedding Vector ]
                                    ↓
                    [ Anti-Spoofing Liveness Check ]
                                    ↓
              [ Cosine Similarity & Threshold Evaluation ]
                                    ↓
            ┌───────────────────────┴───────────────────────┐
            ↓                                               ↓
      [ ENTRY MODE ]                                  [ EXIT MODE ]
 - Punctuality verification (Grace period)      - Active attendance session lookup
 - State: NOT CHECKED IN → CURRENTLY INSIDE     - State: CURRENTLY INSIDE → SHIFT COMPLETED
 - Anti-duplicate cooldown validation           - Duration calculation (HH:MM worked)
 - Instant ledger timestamp                     - Shift completion verification
            └───────────────────────┬───────────────────────┘
                                    ↓
                     [ Persistent Relational Database ]
                                    ↓
         [ Real-Time SSE Stream & HospitalAI Assistant (Gemini 3.8) ]
```

---

## 🚀 Key Features

1. **Biometric Face Recognition Gateway**:
   - High-performance, client-side normalized 128-dimensional facial feature representation with Cosine Similarity comparison.
   - Dual **Entry** & **Exit** Station modes with dedicated targeting reticles, laser scanning line animations, and audio feedback chimes.
   - Configurable recognition threshold (default 72% / 0.72) with instant "Low Confidence" handling.
   - Anti-spoofing micro-variance optical liveness checks to deter printed photographs.
   - Anti-duplicate cooldown window (default 45s) and state-machine validation (`NOT CHECKED IN` → `CURRENTLY INSIDE` → `SHIFT COMPLETED`).

2. **Live Workforce Dashboard**:
   - Live statistics calculated in real-time from the database: Total Staff, Present Today, Absent Today, Currently Inside, Shift Completed, and Late Arrivals.
   - Real-time Server-Sent Events (SSE) live activity feed updating dynamically without page refreshes.
   - Live authoritative second-by-second clock formatted in `Asia/Kolkata` (Indian Standard Time).
   - AI Attendance Insight card summarizing operational workforce trends.

3. **Staff Management & Multi-Sample Face Registration**:
   - Complete directory with search across name, ID (`BH-1042`), department, and designation.
   - Multi-sample live camera face enrollment (Sample 1: Frontal, Sample 2: Expression, Sample 3: Angled, Sample 4: Confirmatory) aggregated into a secure normalized unit vector.

4. **Interactive Workforce Calendar**:
   - Monthly calendar view with color-coded daily presence indicators (🟢 Present, 🟡 Late, 🔴 Absent, 🔵 Weekly Off).
   - Click any date to inspect full staff entry/exit times, durations, and attendance statuses.

5. **Staff Profile Modal**:
   - Complete profile badges with lifetime and monthly performance: Present Days, Absent Days, Late Arrivals, Total Hours Worked, and Average Daily Hours.

6. **Attendance Ledger & Mandatory Audit Corrections**:
   - Filterable data table with date picker, department filter, and status filters.
   - Manual correction modal with mandatory audit reason logging for regulatory hospital compliance.

7. **HospitalAI Assistant (Gemini 3.8 Flash)**:
   - Natural language queries answered strictly using actual database context ("Who has not arrived today?", "Which staff arrived after 9:15 AM?", "Show today's ICU attendance").
   - Server-side execution ensuring API keys are never exposed to the client bundle.
   - Deterministic local ground-truth fallback engine when offline or unkeyed.

8. **Automated Monthly Attendance Reports**:
   - Automatic reconciliation of working days, total hours, and punctuality.
   - Export to CSV, Excel (TSV), and print-ready PDF layouts.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Web Audio API.
- **Backend**: Node.js, Express, TSX, Server-Sent Events (SSE), Crypto.
- **Computer Vision**: HTML5 Canvas, Shape Detection API, Histogram Equalization, 128-d HOG feature extraction, Cosine vector similarity.
- **AI Engine**: `@google/genai` (Gemini 3.8 Flash) with server-side proxying.
- **Database**: Relational file-backed persistent JSON database engine with integrity constraints.

---

## 🔑 Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# GEMINI_API_KEY: Required for Gemini AI API queries (server-side only)
GEMINI_API_KEY="your_gemini_api_key_here"

# Server Port (default 3000)
PORT=3000

# Hospital Timezone
HOSPITAL_TIMEZONE="Asia/Kolkata"
```

---

## 💻 Development & Deployment Commands

```bash
# Install dependencies
npm install

# Start full-stack development server (Express backend + Vite frontend on port 3000)
npm run dev

# Typecheck and lint codebase
npm run lint

# Build frontend assets for production
npm run build

# Start production server
npm run start
```

---

## 🔐 Security & Biometric Privacy

- **Biometric Minimization**: Only 128-dimensional mathematical floating-point feature embeddings are persisted. Raw facial biometric imagery is not unnecessarily retained.
- **Credential Protection**: Server-side API key handling for `@google/genai`; no secrets leaked to browser clients.
- **Tamper-Evident Audit Logging**: Every manual attendance modification or staff deactivation is recorded with administrator identity, timestamp, and justification.
- **Role-Based Access**: Administrative routes protected by session validation.
