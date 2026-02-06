# ResumeX 🚀
> **The AI-Powered Recruitment & Assessment Platform**

ResumeX is a next-generation hiring platform that automates the screening process using advanced AI and provides a comprehensive assessment suite for candidates. It bridges the gap between resume parsing and deep technical evaluation, ensuring only the best candidates move forward.

---

## 🌟 Key Features

### 🤖 For Recruiters
*   **AI Gatekeeper**: Automatically parses resumes (PDF) and ranks candidates based on Job Description matching (70% Skills + 30% Experience).
*   **Smart Scoring Engine**: A deterministic, auditable scoring system combining multiple assessment layers.
*   **Recruiter Dashboard**: Real-time analytics, candidate pipelines, and "Invite to Interview" workflows.
*   **Anti-Cheat Proctoring**: Monitors tab switching, copy-paste events, and window blurring during assessments.

### 👨‍💻 For Candidates
*   **Integrated IDE**: Full-featured code editor with syntax highlighting and real-time test execution.
*   **Multi-Modal Assessments**:
    *   **Coding Challenges**: Python-based algorithmic problems.
    *   **Technical Text**: AI-graded conceptual questions.
    *   **Psychometric Tests**: Cognitive aptitude evaluation.
    *   **Behavioral Sliders**: Culture fit assessment.
*   **Clean UI**: Specific dashboards for tracking applications and assessment progress.

---

## 🛠 Tech Stack

### **Frontend**
*   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS + [Shadcn UI](https://ui.shadcn.com/)
*   **State**: React Hooks, Context API
*   **Visuals**: Recharts (Analytics), Framer Motion (Animations), Lucide React (Icons)

### **Backend**
*   **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
*   **Database**: Supabase (PostgreSQL) via SQLAlchemy
*   **Auth**: [Clerk](https://clerk.com/)
*   **AI/ML**: 
    *   Hugging Face Inference API (`meta-llama/Llama-3.2-3B-Instruct`)
    *   `pdfplumber` for text extraction
    *   Custom Regex-based skill extraction
*   **Execution**: Python `subprocess` with sandbox/timeout limits

---

## 🏗 Architecture Overview

ResumeX uses a **4-Pillar Scoring Model** to evaluate candidates:

1.  **Qualifying Gate (ATS)**: Resume parsing & initial matching.
2.  **Technical (40%)**: Coding challenges run in a secure sandbox.
3.  **Knowledge (30%)**: Text-based technical questions graded by Llama-3 + Keyword matching.
4.  **Fit (30%)**: Psychometric & Behavioral sliders (15% + 15%).

**Data Flow:**
`Candidate Resume` -> `AI Gatekeeper` -> `Shortlist` -> `Assessment Invite` -> `Submission` -> `Scoring Engine` -> `RecruiterAnalysis Table` -> `Final Verdict`

---

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+
*   Python 3.10+
*   Supabase Account
*   Clerk Account for Auth

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/resumex.git
cd resumex
```

### 2. Backend Setup
Navigate to the backend directory and set up the Python environment.

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```
*The API will run on `http://localhost:8000`*

### 3. Frontend Setup
Navigate to the root directory (or separate frontend dir if applicable) to install Node packages.

```bash
# Install dependencies
pnpm install

# Run development server
pnpm run dev
```
*The Frontend will run on `http://localhost:3000`*

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_KEY=[YOUR_SUPABASE_ANON_KEY]

# Auth
CLERK_SECRET_KEY=[YOUR_CLERK_SECRET_KEY]
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=[YOUR_CLERK_PUBLIC_KEY]

# AI
HF_TOKEN=[YOUR_HUGGING_FACE_TOKEN]
```

Create a `.env.local` file in the root directory for Next.js:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=[YOUR_CLERK_PUBLIC_KEY]
CLERK_SECRET_KEY=[YOUR_CLERK_SECRET_KEY]
```

---

## 📚 API Documentation

Key endpoints available in the backend:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/applications/apply` | Submit resume & create application |
| `GET` | `/api/jobs/{id}/applications` | Get all candidates for a job |
| `POST` | `/api/assessments/{job_id}/submit` | Submit coding assessment |
| `POST` | `/api/problems/{id}/run-sample-tests` | Run code against sample tests |
| `POST` | `/api/problems/{id}/evaluate` | **Final Grade**: Run against hidden tests |
| `GET` | `/api/recruiter/analytics` | Fetch detailed candidate analysis |

---

## 🛡 Security & Proctoring

ResumeX takes integrity seriously.
*   **Tab Switch Detection**: Javascript listeners track visibility state.
*   **Window Blur**: Detects when focus is lost.
*   **Safe Execution**: User code is run in restricted subprocesses with no access to `os`, `sys` or network.

---

## 📄 License

This project is licensed under the MIT License.
