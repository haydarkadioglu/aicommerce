# AI Commerce Operating System

The world's first AI-powered Commerce Operating System — an autonomous business assistant that helps e-commerce sellers discover profitable products, analyze markets, generate listings, and make data-driven decisions using AI.

> **Think Shopify Admin + Notion + ChatGPT + Monday.com + AI Research Platform — combined into one Commerce Operating System.**

## Demo

- **URL**: http://localhost:3000
- **Login**: `admin@ai-commerce.os`
- **Password**: `AdminPass123`

## Features

### Core Platform
- **Multi-Store Architecture** — Manage unlimited stores across 8 marketplaces (Etsy, Shopify, WooCommerce, Amazon, eBay, TikTok Shop, Facebook, Custom) with complete data isolation
- **Authentication & RBAC** — JWT-based auth with bcrypt password hashing, refresh token rotation, brute-force lockout, 26 fine-grained permissions
- **Store Switcher** — Instantly switch between stores; all modules update automatically
- **Command Palette (⌘K)** — Fuzzy search across all 20 modules

### AI Engine
- **AI Provider Layer** — Provider-agnostic architecture supporting Z.AI (bundled), OpenAI, Gemini, Claude, Grok, OpenRouter, DeepSeek, Mistral, Cohere, and local models
- **AI Orchestrator** — Central intelligence layer handling provider selection, prompt resolution, memory hydration, retry logic, usage/cost tracking, and audit logging
- **12 AI Agents** — Research, SEO, Trend, Listing, Supplier, Profit, Pricing, Similarity, Vision, Prompt, Strategy, and General
- **Prompt Engine** — Versioned, editable, DB-backed prompts with variable substitution
- **AI Memory** — Per-store, per-agent memory with importance scoring

### Intelligence Platform
- **Product Hunter** — Natural language search ("I want premium dog decor") across 7 marketplace connectors
- **Market Research** — Comprehensive intelligence: sales, demand, trend, competition, saturation, reviews, keywords, listing quality, image quality, and Etsy-specific analysis
- **One-Click Pipeline** — 7-step autonomous workflow: Research → Supplier → Profit → Decision → SEO → Listing → Save
- **Business Advisor** — AI business consultant answering "Should I sell this?" with verdict, confidence, advantages, risks, and next actions
- **Opportunity Scanner** — Auto-detect trending, low-competition, high-ROI, seasonal, and emerging-category opportunities
- **Supplier Intelligence** — Compare suppliers: MOQ, lead time, certifications, Trade Assurance, Gold status, reliability score
- **Competitor Monitor** — Track competitor shops for new products, price changes, SEO updates, and listing updates
- **Market Gap Detector** — Identify missing opportunities: high demand + few sellers, weak listings, poor photography, missing styles
- **Price Intelligence** — Detect price increases, drops, outliers, and recommend optimal pricing
- **Profit Forecast** — Monthly/quarterly/yearly forecasts with best-case, expected, and worst-case scenarios
- **Niche Expansion** — Auto-discover complementary products for a niche with store compatibility scoring
- **Visual Product Matching** — Cross-marketplace similarity (shape, material, pattern, color, style)

### Content Generation
- **AI Listing Studio** — Generate, rewrite, expand, shorten, translate, and optimize marketplace listings
- **SEO Engine** — SEO scores, keyword density, missing keywords, readability, and search visibility estimates
- **Media Studio** — AI image generation with style presets, batch generation, and save-to-project
- **Image Studio** — Product photography, lifestyle shots, and marketing visuals with 7 aspect ratios

### Automation & Operations
- **Automation Center** — Configurable workflows: daily trend scans, weekly supplier scans, profit reports, competitor monitoring, opportunity alerts, listing drafts, and price alerts
- **Export Center** — Export products, profit, suppliers, competitors, SEO, listings, and opportunities as CSV or JSON
- **Analytics Dashboard** — AI usage stats, daily token charts, agent breakdown, recent activity timeline, and plan usage tracking

### Admin Panel
- **Users** — CRUD with impersonation for support debugging
- **Roles & Permissions** — RBAC management with 26 permissions
- **AI Providers** — Configure API keys, base URLs, models, and costs
- **Prompts** — Versioned prompt editor with history
- **Agents** — Toggle agent activation and configure defaults
- **Logs** — Audit log and system log with severity filtering
- **Usage Analytics** — 3 recharts visualizations (area, pie, bar) + aggregations
- **Feature Flags** — Toggle modules on/off with rollout percentages
- **Plans** — Manage subscription plans (Free/Pro/Business/Enterprise)
- **System Status** — Health metrics, memory, uptime, and cache management

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM + SQLite (portable to PostgreSQL) |
| Auth | JWT (jsonwebtoken) + bcrypt, custom session management |
| State | Zustand (client) + TanStack Query (server) |
| AI | z-ai-web-dev-sdk (GLM-4.6) + provider-agnostic abstraction |
| Charts | Recharts |
| Icons | Lucide React |
| Animations | Framer Motion |
| Markdown | react-markdown |
| Theme | next-themes (light/dark) |

## Prerequisites

- **Node.js** 18+ 
- **Bun** (package manager + runtime)
- **SQLite** (bundled — no separate install needed)

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/haydarkadioglu/aicommerce.git
cd aicommerce
```

### 2. Install dependencies

```bash
bun install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=file:./db/custom.db
AUTH_SECRET=your-super-secret-jwt-key-change-in-production
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

### 4. Initialize the database

```bash
bun run db:push
```

This creates the SQLite database with all 50 tables.

### 5. Seed the database

```bash
bun run scripts/seed.ts
```

This creates:
- 26 permissions + 2 system roles (admin, user)
- Default admin user (`admin@ai-commerce.os` / `AdminPass123`)
- Default AI provider (Z.AI with GLM-4.6 and GLM-4.5 models)
- 8 pre-registered marketplace connectors
- 12 AI agents with system prompts
- 12 versioned prompts
- 10 feature flags
- 4 subscription plans
- 5 platform settings

### 6. Start the development server

```bash
bun run dev
```

The platform will be available at **http://localhost:3000**.

### 7. Log in

- **Email**: `admin@ai-commerce.os`
- **Password**: `AdminPass123`

## Project Structure

```
aicommerce/
├── prisma/
│   └── schema.prisma          # 50 Prisma models
├── scripts/
│   └── seed.ts                # Database seeder
├── src/
│   ├── app/
│   │   ├── api/               # 65 API route files
│   │   │   ├── advisor/        # Business Advisor
│   │   │   ├── ai/             # AI chat, agents, images, conversations, memory, usage
│   │   │   ├── admin/          # Users, roles, providers, prompts, agents, logs, etc.
│   │   │   ├── auth/           # Register, login, logout, me, refresh, reset-password
│   │   │   ├── automation/      # Automation rules + runs
│   │   │   ├── competitors/     # Competitor monitoring
│   │   │   ├── discover/        # Product discovery engine
│   │   │   ├── export/          # Export center (CSV/JSON)
│   │   │   ├── gaps/            # Market gap detector
│   │   │   ├── hunter/          # AI Product Hunter
│   │   │   ├── intelligence/     # Product analysis API
│   │   │   ├── listings/        # AI Listing Studio
│   │   │   ├── niche/           # Niche expansion
│   │   │   ├── notifications/   # User notifications
│   │   │   ├── onboarding/      # Onboarding checklist
│   │   │   ├── opportunities/   # Opportunity scanner
│   │   │   ├── pipeline/        # One-click pipeline
│   │   │   ├── pricing/         # Price intelligence
│   │   │   ├── profit/          # Profit forecast
│   │   │   ├── projects/        # Project + product CRUD + import/export
│   │   │   ├── seo/             # SEO engine
│   │   │   ├── stores/          # Store management
│   │   │   └── suppliers/       # Supplier comparison
│   │   ├── globals.css         # Tailwind + brand theme
│   │   ├── layout.tsx          # Root layout with providers
│   │   └── page.tsx            # Single-route entry (landing + app shell)
│   ├── components/
│   │   ├── admin/              # 13 admin modules
│   │   ├── app/                # App shell, sidebar, topbar, command palette
│   │   ├── intelligence/        # Product Hunter, Pipeline, Advisor, Opportunities, etc.
│   │   ├── landing/             # Landing page + auth modal
│   │   ├── stores/              # Store management
│   │   ├── ui/                  # 40+ shadcn/ui components
│   │   └── user/                # 14 user modules
│   ├── hooks/
│   │   ├── use-api.ts          # API client with auto-refresh
│   │   ├── use-mobile.ts        # Mobile detection
│   │   └── use-toast.ts        # Toast notifications
│   ├── lib/
│   │   ├── ai/                  # Provider layer, orchestrator, agents, prompts, memory
│   │   ├── auth/                # Session, password, require-admin
│   │   ├── cache/               # LRU cache
│   │   ├── connectors/          # 7 marketplace connectors
│   │   ├── logger/              # System + audit logger
│   │   ├── notify.ts            # Notification helper
│   │   ├── rbac/                # Role-based access control
│   │   ├── relative-time.ts     # Time formatting
│   │   ├── subscription.ts      # Plan limits + usage enforcement
│   │   └── utils.ts             # Utilities
│   └── stores/
│       ├── app-store.ts         # UI state (view, sidebar, active store)
│       └── auth-store.ts        # Auth state (user, tokens, impersonation)
├── .env                        # Environment variables
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── Caddyfile                   # Gateway config
```

## Architecture

### Hierarchy

```
User
 └── Store (unlimited, fully isolated)
      ├── Projects
      │    └── Products
      │         ├── Listings (AI-generated)
      │         ├── AI Reports (research, supplier, competitor, trend, profit)
      │         ├── Media Assets (images, videos)
      │         └── AI Decisions (go/hold/avoid/pivot)
      ├── AI Memory (per-store, per-agent)
      ├── Automation Rules (per-store)
      ├── Discovered Products
      ├── Competitor Shops
      └── Notifications
```

### AI Flow

```
User Query (natural language)
    ↓
Product Hunter (AI intent parsing)
    ↓
Marketplace Connectors (Etsy, Alibaba, 1688, Amazon, Pinterest, Google Trends, TikTok)
    ↓
Discovered Products (persisted with store association)
    ↓
One-Click Pipeline:
    Research → Supplier → Profit → Decision → SEO → Listing → Save
    ↓
Product Workspace (unified view)
    ↓
Export Center (CSV/JSON for marketplace sync)
```

### Provider-Agnostic AI

```
AI Orchestrator
    ↓
AIProviderAdapter (interface)
    ├── ZAIProvider (bundled, z-ai-web-dev-sdk → GLM-4.6)
    └── OpenAICompatibleProvider (OpenAI, Gemini, Claude, Grok, OpenRouter, DeepSeek, Mistral, Cohere)
```

## Available Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start dev server on port 3000 |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema to SQLite database |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Create + apply migration |
| `bun run db:reset` | Reset database (destructive) |
| `bun run scripts/seed.ts` | Seed database with default data |

## Marketplace Connectors

| Connector | Key | Supported Modes |
|---|---|---|
| Etsy | `etsy` | keyword, category, trend, style, material |
| Alibaba | `alibaba` | keyword, category, material |
| 1688 | `1688` | keyword, category, material |
| Amazon | `amazon` | keyword, category |
| Pinterest | `pinterest` | keyword, trend, style |
| Google Trends | `google-trends` | keyword, trend |
| TikTok | `tiktok` | keyword, trend |

Adding a new marketplace: implement the `MarketplaceConnector` interface and register it in `src/lib/connectors/index.ts`.

## AI Agents

| Agent | Key | Responsibility |
|---|---|---|
| General Assistant | `general` | Everyday tasks and chat |
| Research Agent | `research` | Product discovery and market analysis |
| SEO Agent | `seo` | Titles, tags, keywords, meta data |
| Trend Agent | `trend` | Market trends, seasonality, momentum |
| Listing Agent | `listing` | Marketplace-ready listing generation |
| Supplier Agent | `supplier` | Sourcing, MOQ, lead time, reliability |
| Profit Agent | `profit` | Margins, ROI, break-even, forecasts |
| Pricing Agent | `pricing` | Optimal pricing strategies |
| Similarity Agent | `similarity` | Cross-marketplace product matching |
| Vision Agent | `vision` | Image analysis and generation |
| Prompt Agent | `prompt` | Prompt optimization |
| Strategy Agent | `strategy` | Business decisions and roadmaps |

## Subscription Plans

| Plan | Price | AI Calls/mo | Projects | Marketplaces |
|---|---|---|---|---|
| Free | $0 | 100 | 3 | 1 |
| Pro | $29/mo | 5,000 | 50 | 3 |
| Business | $99/mo | 50,000 | 500 | 10 |
| Enterprise | $499/mo | Unlimited | Unlimited | Unlimited |

## Local-First Design

The platform runs entirely on a local machine:
- **Database**: SQLite (file-based, no server needed)
- **AI**: Uses bundled z-ai-web-dev-sdk (no external API keys required for default provider)
- **Storage**: Generated images saved to `/download/images/`
- **No cloud dependencies**: Everything works offline (except external marketplace connectors)

## Cloud Migration Path

The architecture is designed for seamless cloud migration:
1. **Database**: Change `DATABASE_URL` to PostgreSQL connection string
2. **Storage**: Swap file-based image storage for S3/Cloudflare R2
3. **AI Providers**: Add API keys in admin panel to activate OpenAI/Gemini/Claude
4. **Deployment**: `bun run build` produces a standalone Next.js server

## Internationalization (i18n)

The platform supports multiple languages. Currently available:

| Language | Code | Status |
|---|---|---|
| English | `en` | ✅ Complete |
| Turkish | `tr` | ✅ Complete |

### Adding a new language

1. Create a new translation file: `src/locales/{code}.json` (copy from `en.json`)
2. Add the locale to `src/i18n/index.ts` in the `messages` map and `availableLocales` array
3. Translate all string values
4. The language switcher in the topbar will automatically show the new option

### How it works

- Uses a lightweight Zustand-based i18n system (no URL-based routing needed)
- Language preference is persisted in localStorage
- The `t("key.path")` function translates strings at runtime
- Translation files are organized by namespace: `nav`, `auth`, `landing`, `dashboard`, `hunter`, `pipeline`, `stores`, `ai`, `settings`, `admin`, `language`

```typescript
import { useI18n } from "@/i18n";

function MyComponent() {
  const { t } = useI18n();
  return <h1>{t("nav.dashboard")}</h1>;
  // English: "Dashboard"
  // Turkish: "Kontrol Paneli"
}
```

## License

MIT

## Author

**Haydar Kadioglu**
- Email: a.haydar.kadioglu@hotmail.com
- GitHub: [@haydarkadioglu](https://github.com/haydarkadioglu)
