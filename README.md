# ResumeVC — Version-Controlled Resume Builder

### 🌐 [Live Demo → resume-forgev.vercel.app](https://resume-forgev.vercel.app)

> Git-style version control for your resumes, powered by AI.

ResumeVC is a full-stack resume management platform that treats your resume like source code — with versioning, commits, diffs, AI-powered generation, and smart recommendations. Build, iterate, and tailor your resume for every opportunity.

![Landing Page](screenshots/landing.png)

---

## ✨ Features

### 📝 Resume Editor
- **Rich text editing** with TipTap — bullet points, formatting, and structured sections
- **Drag-and-drop reordering** of experience, projects, achievements, and education using dnd-kit
- **Live preview** — see your resume update in real-time as you type
- **PDF export** — one-click download of print-ready resumes
- **Structured sections** — Personal Details, Experience, Projects, Achievements, Education

![Resume Editor](screenshots/editor.png)

### 🔀 Version Control
- **Commit system** — save snapshots of your resume with commit messages
- **Version history** — browse, compare, and restore any previous version
- **Visual diffs** — side-by-side comparison showing exactly what changed
- **Activity logging** — track all changes across your resumes

![Version History & Diffs](screenshots/version-history.png)

### 🤖 AI-Powered Features
- **Sample resume generation** — AI creates a complete, realistic resume based on your chosen category (Full Stack, Frontend, Backend, DevOps, etc.) and company type (FAANG, Startup, Enterprise, Fintech, etc.)
- **Context-aware generation** — if you have existing resumes, AI uses your real experience as a foundation
- **Smart recommendations** — AI analyzes your resumes and recommends the best version for a target company
- **AI-generated content tagging** — items created by AI are marked with an "AI Recommended" badge so you know what to personalize
- **Auto-retry** — if AI generation fails, it automatically retries up to 3 times

### 🔐 Authentication
- **Clerk integration** — Google OAuth and email/password sign-in
- **Guest mode** — try the editor without signing up (changes aren't saved)
- **JWT tokens** — secure API with access and refresh token rotation

![Dashboard](screenshots/dashboard.png)

![Profile & Contribution Graph](screenshots/profile.png)

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 7, React Router 7 |
| **Styling** | Vanilla CSS with CSS variables, Framer Motion animations |
| **UI Components** | Radix UI (Dialog, Dropdown, Avatar), Lucide icons |
| **Rich Text** | TipTap (ProseMirror-based) |
| **Drag & Drop** | dnd-kit |
| **PDF Export** | react-to-print |
| **Backend** | Express 5, TypeScript |
| **Database** | PostgreSQL (Neon), Prisma ORM |
| **Auth** | Clerk (OAuth + JWT) |
| **AI** | Groq API (LLM for resume generation & recommendations) |
| **Validation** | Zod |
| **DevOps** | Docker Compose, Husky + lint-staged |

---

## 📁 Project Structure

```
ResumeVC/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── auth/       # AuthPromptDialog, ProtectedRoute, GoogleButton
│   │   │   ├── editor/     # EditorSidebar, SortableList, RichTextEditor, AIAssistant
│   │   │   ├── layout/     # AppLayout, Navbar
│   │   │   ├── ui/         # Button, Dialog, Avatar, DropdownMenu
│   │   │   └── version-control/  # CommitHistory, DiffViewer
│   │   ├── pages/          # Route pages
│   │   │   ├── Home.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Editor.jsx          # Main resume editor
│   │   │   ├── Recommendations.jsx # AI recommendations & sample generation
│   │   │   ├── ResumeHistory.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── services/       # API client (Axios)
│   │   ├── styles/         # CSS (variables, layouts, components)
│   │   └── data/           # Mock data for guest mode
│   └── package.json
├── server/                 # Express API (TypeScript)
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── middlewares/     # Auth middleware
│   │   ├── routes/         # API routes (auth, resume, ai)
│   │   ├── services/       # Business logic (AI, recommendations)
│   │   └── app.ts          # Express app setup
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
├── docker-compose.yml      # Full-stack Docker setup
└── package.json            # Monorepo root (workspaces)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** (or use [Neon](https://neon.tech) for serverless Postgres)
- **Clerk account** for authentication ([clerk.com](https://clerk.com))
- **Groq API key** for AI features ([groq.com](https://groq.com))

### 1. Clone the repository

```bash
git clone https://github.com/nikhil-m-star/resumeVC.git
cd resumeVC
```

### 2. Install dependencies

```bash
npm install
```

This installs dependencies for both `client/` and `server/` workspaces.

### 3. Set up environment variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
PORT=3001
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
JWT_SECRET=your-random-secret-here
JWT_REFRESH_SECRET=your-random-refresh-secret-here
CLERK_SECRET_KEY="sk_test_..."
CLERK_PUBLISHABLE_KEY="pk_test_..."
GROQ_API_KEY="gsk_..."
```

For the client, create `client/.env`:

```env
VITE_API_URL=http://localhost:3001/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 4. Set up the database

```bash
cd server
npx prisma db push
```

### 5. Start development

```bash
# From the root directory — starts both client and server
npm run dev
```

- **Client**: http://localhost:5173
- **Server**: http://localhost:3001

### Alternative: Docker

```bash
docker-compose up --build
```

---

## 📡 API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login with email/password |
| `GET` | `/api/resumes` | List user's resumes |
| `POST` | `/api/resumes` | Create a new resume |
| `GET` | `/api/resumes/:id` | Get a specific resume |
| `PUT` | `/api/resumes/:id` | Update a resume |
| `DELETE` | `/api/resumes/:id` | Soft-delete a resume |
| `POST` | `/api/resumes/:id/commit` | Create a version commit |
| `GET` | `/api/resumes/:id/history` | Get version history |
| `POST` | `/api/ai/generate-sample` | AI-generate a sample resume |
| `POST` | `/api/ai/recommend` | Get AI resume recommendation |

---

## 🗄️ Database Schema

```
User ──┬── Resume ──┬── ResumeVersion
       │            ├── Collaborator
       │            ├── Comment
       │            └── ActivityLog
       ├── Collaborator
       ├── Comment
       └── ActivityLog
```

**Key models**: `User`, `Resume`, `ResumeVersion` (immutable snapshots), `Collaborator` (VIEWER/EDITOR roles), `Comment` (with resolved state), `ActivityLog`.

---

## 🧠 AI Features in Detail

### Sample Resume Generation
Generate a complete resume from scratch or enhance your existing data:
- Choose a **category** (Full Stack, Frontend, Backend, DevOps, Data Science, etc.)
- Choose a **company type** (FAANG, Startup, Enterprise, Fintech, Healthcare, etc.)
- AI creates realistic experience, projects, achievements, and education
- Content from existing resumes is used as context when available
- AI-generated items are tagged with `aiGenerated: true` and shown with a visual badge

### Smart Recommendations
Paste a target company name, and the AI:
1. Analyzes all your resume versions
2. Scores each against the target company's typical requirements
3. Recommends the best-fit version with reasoning
4. Provides category-specific and company-specific improvement suggestions

---

## 📜 License

ISC

---

**Built by [Nikhil M](https://github.com/nikhil-m-star)**
