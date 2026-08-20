# Incident Knowledge Base

T24/Temenos Incident Search, Troubleshooting & Knowledge Management System.

## Tech Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS
- **Database:** PostgreSQL 16 with full-text search + pg_trgm
- **Excel Import:** Node.js + XLSX library

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Setup PostgreSQL

```bash
# Create database and user
sudo -u postgres psql -c "CREATE USER tcsp_kb WITH PASSWORD 'tcsp_kb_2026';"
sudo -u postgres psql -c "CREATE DATABASE tcsp_incident_kb OWNER tcsp_kb;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tcsp_incident_kb TO tcsp_kb;"

# Create schema
cd /home/bililign/Documents/projects/TCSP-Incident-Knowledge-Base
psql -d tcsp_incident_kb -f scripts/schema.sql
```

### 3. Import Excel data

```bash
npx tsx scripts/import-xlsx.ts /path/to/Incident_Knowledge_Base_v3.xlsx
```

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | `/` | Stats, group distribution, quick links |
| Search | `/search?q=LIMIT+EXPIRED` | Full-text search with filters |
| Groups | `/groups` | Browse all 10 incident groups |
| Group Detail | `/groups/E` | Group overview, subtypes, tickets |
| Knowledge | `/knowledge` | Browse knowledge articles |
| Article | `/knowledge/1` | Structured troubleshooting page |
| Tickets | `/tickets` | Ticket list with filters |
| Ticket Detail | `/tickets/TSR-3183311` | Ticket info + related knowledge |
| Keywords | `/keywords` | Quick lookup keyword mappings |

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── layout.tsx            # Root layout + navigation
│   ├── search/page.tsx       # Search page
│   ├── groups/
│   │   ├── page.tsx          # Groups listing
│   │   └── [code]/page.tsx   # Group detail
│   ├── knowledge/
│   │   ├── page.tsx          # Articles listing
│   │   └── [id]/page.tsx     # Article detail
│   ├── tickets/
│   │   ├── page.tsx          # Tickets listing
│   │   └── [id]/page.tsx     # Ticket detail
│   ├── keywords/page.tsx     # Quick lookup
│   └── api/
│       ├── stats/route.ts    # Dashboard stats
│       ├── search/route.ts   # Search API
│       ├── groups/           # Groups API
│       ├── tickets/          # Tickets API
│       ├── knowledge/        # Articles API
│       └── keywords/route.ts # Keywords API
├── components/
│   ├── Navigation.tsx        # Sidebar navigation
│   └── ui/                   # Reusable UI components
└── lib/
    ├── db.ts                 # PostgreSQL connection
    ├── types.ts              # TypeScript types
    └── search.ts             # Search engine
```

## Environment Variables

Copy `.env.example` to `.env.local`:

```
DATABASE_URL="postgresql://tcsp_kb:tcsp_kb_2026@localhost:5432/tcsp_incident_kb"
NEXTAUTH_SECRET="change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
```
# Incident-Knowledge-Base
