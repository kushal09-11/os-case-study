# CoreGuard: Predictive Security-Aware Dynamic Process Migration and Intelligent Load Balancing in Multicore Cloud Computing Environments

> **Educational Systems Disclaimer**: The project simulates multicore process/workload scheduling and migration at the application level. CPU utilization, migration cost, cache penalty, and memory penalty are modeled/estimated for educational demonstration. The project does not replace the operating system kernel scheduler.

Please refer to the full implementation and documentation in [`coreguard/`](./coreguard):
- **Frontend (React.js + Tailwind CSS + Framer Motion)**: [`coreguard/frontend/`](./coreguard/frontend)
- **Backend (FastAPI + SQLite + Scikit-Learn)**: [`coreguard/backend/`](./coreguard/backend)
- **Database (`coreguard.db`)**: [`coreguard/database/`](./coreguard/database)
- **Detailed Documentation**: [`coreguard/README.md`](./coreguard/README.md)

---

## Quick Start

### 1. Backend (FastAPI & ML Engine)
```bash
cd coreguard/backend
pip install -r requirements.txt
python ml/train.py
python main.py
```
Backend will run at: `http://localhost:8000` (API Docs at `/docs`)

### 2. Frontend (React & SVG Simulator)
```bash
cd coreguard/frontend
npm install
npm run dev
```
Simulator will run at: `http://localhost:5173`