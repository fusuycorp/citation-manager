# Repository Map

61 files · 9196 lines of parsed code · ranked by PageRank+in-degree + 90d churn + entry points

## Entry points

- `server/middleware.ts`

## Core modules

`server/db.ts` · 138 ln · ← admin, api.test, auth, citations, +8 · 1 commit/90d
  :5    export const db = new Database(dbPath, { create: true });
  :12   export function initDB()

`server/middleware.ts` · 94 ln · ← admin, auth, citations, doi, +5 · 1 commit/90d · entry point
  :5    export interface UserSession
  :15   export function signToken(payload: UserSession): string
  :22   export function verifyToken(token: string): UserSession | null
  :38   export async function authMiddleware(c: Context, next: Next)
  :66   export async function adminMiddleware(c: Context, next: Next)
  :74   export async function optionalAuthMiddleware(c: Context, next: Next)

`server/formatter.ts` · 440 ln · ← citations, doi, formatter.test, profiles, +1 · 1 commit/90d
  :1    export interface Author
  :6    export interface CitationData
  :20   export type CitationStyle = "APA7" | "IEEE" | "MLA9" | "Chicago17" | "Harvard" | "BibTe…
  :21   export type InTextMode = "parenthetical" | "narrative";
  :23   export interface FormattedCitation
  :36   export function parseAuthorString(authorStr: string): Author
  :52   export function parseRawAuthorsList(raw: string | string[]): Author[]
  :70   function capitalizeName(name: string): string
  :82   function formatInitials(firstName?: string): string
  :91   export function toCSLJSON(data: CitationData): any
  :115  export function toCOinS(data: CitationData): string
  :143  export function toHighwireMetaTags(data: CitationData): string[]
  ... +9 more symbols

`server/routes/metrics.ts` · 66 ln · ← api.test, server/index · 1 commit/90d
  :9    export function calculateHIndex(citationCounts: number[]): number

## Supporting files

`client/src/App.tsx` · 885 ln · ← src/main · 1 commit/90d · :18 function getInitialTheme · :31 function parseHashRoute · :47 export const App: React.FC = 

`server/routes/admin.ts` · 290 ln · ← server/index · 1 commit/90d · :10 function logAuditEvent

`server/routes/auth.ts` · 211 ln · ← server/index · 1 commit/90d · :8 export function isDomainWhitelisted

`server/routes/citations.ts` · 404 ln · ← server/index · 1 commit/90d · :9 function parseAuthors

`server/routes/profiles.ts` · 284 ln · ← server/index · 1 commit/90d · :9 function parseAuthors · :21 function isAuthorMatch

`client/src/components/AuthModal.tsx` · 175 ln · ← App · 1 commit/90d · :3 interface AuthModalProps · :10 export const AuthModal: React.FC<AuthModalProps> = 

`client/src/components/CitationEditorModal.tsx` · 351 ln · ← App · 1 commit/90d · :3 interface AuthorInput · :8 interface CitationEditorModalProps · :17 export const CitationEditorModal: React.FC<CitationEditorModalProps> = 

`client/src/components/CitationInspectorPane.tsx` · 459 ln · ← App · 1 commit/90d · :3 export type CitationStyle = "APA7" | "IEEE" | "MLA9" | "Chicago17" | "Harvard" | "BibTe… · :5 interface CitationInspectorPaneProps · :16 function formatClientCitation · :61 export const CitationInspectorPane: React.FC<CitationInspectorPaneProps> = 

`client/src/components/CitationList.tsx` · 264 ln · ← App · 1 commit/90d · :3 interface CitationListProps · :18 export const CitationList: React.FC<CitationListProps> = 

`client/src/components/CitationPreviewerModal.tsx` · 184 ln · ← App · 1 commit/90d · :4 interface CitationPreviewerModalProps · :11 export const CitationPreviewerModal: React.FC<CitationPreviewerModalProps> = 

`client/src/components/CoAuthorInviteModal.tsx` · 236 ln · ← App · 1 commit/90d · :3 interface CoAuthorInviteModalProps · :12 export const CoAuthorInviteModal: React.FC<CoAuthorInviteModalProps> = 

`client/src/components/Navbar.tsx` · 225 ln · ← App · 1 commit/90d · :3 interface NavbarProps · :14 export const Navbar: React.FC<NavbarProps> = 

`client/src/components/UserDashboardSidebar.tsx` · 742 ln · ← App · 1 commit/90d · :3 interface UserDashboardSidebarProps · :32 export const UserDashboardSidebar: React.FC<UserDashboardSidebarProps> = 

`client/src/components/WelcomeModal.tsx` · 94 ln · ← App · 1 commit/90d · :3 interface WelcomeModalProps · :9 export const WelcomeModal: React.FC<WelcomeModalProps> = 

`client/src/pages/AdminDashboardPage.tsx` · 754 ln · ← App · 1 commit/90d · :3 interface AdminDashboardPageProps · :9 export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = 

`client/src/pages/AuthPage.tsx` · 151 ln · ← App · 1 commit/90d · :3 interface AuthPageProps · :9 export const AuthPage: React.FC<AuthPageProps> = 

`client/src/pages/HelpPage.tsx` · 95 ln · ← App · 1 commit/90d · :3 interface HelpPageProps · :7 export const HelpPage: React.FC<HelpPageProps> = 

`client/src/pages/ProfilePage.tsx` · 327 ln · ← App · 1 commit/90d · :3 interface ProfilePageProps · :13 export const ProfilePage: React.FC<ProfilePageProps> = 

`client/src/pages/UserSettingsPage.tsx` · 290 ln · ← App · 1 commit/90d · :3 interface UserSettingsPageProps · :11 export const UserSettingsPage: React.FC<UserSettingsPageProps> = 

`client/src/components/AdminDashboardModal.tsx` · 352 ln · 1 commit/90d · :3 interface AdminDashboardModalProps · :10 export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = 

`client/src/components/AdminDomainManagerModal.tsx` · 209 ln · 1 commit/90d · :3 interface AdminDomainManagerModalProps · :10 export const AdminDomainManagerModal: React.FC<AdminDomainManagerModalProps> = 

`client/src/components/BibliometricMetricsPanel.tsx` · 64 ln · 1 commit/90d · :3 interface BibliometricMetricsPanelProps · :7 export const BibliometricMetricsPanel: React.FC<BibliometricMetricsPanelProps> = 

`client/src/components/HeroBanner.tsx` · 37 ln · 1 commit/90d · :3 interface HeroBannerProps · :8 export const HeroBanner: React.FC<HeroBannerProps> = 

`client/src/components/UserPreferencesModal.tsx` · 149 ln · 1 commit/90d · :3 interface UserPreferencesModalProps · :11 export const UserPreferencesModal: React.FC<UserPreferencesModalProps> = 

`server/seed.ts` · 219 ln · 1 commit/90d · :6 interface RawFaculty · :13 function parseRawCitationString · :84 export function runSeed

## Other files

- `.` — 5 files ((no ext), .example, .json, .lock)
- `.agents/` — `activity.jsonl`, `decisions.md`, `memory.md`
- `client/` — `index.html`, `vite.config.ts`
- `client/src/` — `main.tsx`
- `client/src/styles/` — `theme.css`
- `dev-docs/` — 9 files (.md)
- `docs/` — `CODING_STANDARDS.md`, `COMMIT_STANDARDS.md`, `DEVELOPMENT.md`
- `server/` — `index.ts`, `seed_unowned.ts`
- `server/routes/` — 4 files (.ts)
- `server/tests/` — `api.test.ts`, `formatter.test.ts`

_Detailed 29 of 61 files; 32 collapsed above._