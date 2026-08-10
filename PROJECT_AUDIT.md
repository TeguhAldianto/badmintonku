# Project Audit: BadmintonKu

## 1. Struktur Project
```text
badmintonku/
├── app/                  # Next.js App Router directory
│   ├── favicon.ico
│   ├── globals.css       # Tailwind v4 setup
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── public/               # Static assets
├── .git/
├── .gitignore
├── AGENTS.md             # Agent context & instructions
├── CLAUDE.md             # Alias to AGENTS.md
├── eslint.config.mjs     # ESLint flat config
├── next-env.d.ts
├── next.config.ts        # Next.js config
├── package.json          # Dependencies & scripts
├── postcss.config.mjs    # PostCSS with Tailwind v4 plugin
└── tsconfig.json         # TypeScript configuration
```

## 2. Framework dan Dependency
- **Framework Core**: Next.js 16.3 (App Router)
- **UI & State**: React 19.2.8, React DOM 19.2.8
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Language**: TypeScript ^5
- **Linter**: ESLint ^9 (`eslint-config-next`)

## 3. Command Development
- `npm run dev` — Menjalankan development server lokal (`next dev`)

## 4. Command Lint
- `npm run lint` — Menjalankan ESLint (`eslint`)

## 5. Command Test
- **Tidak ada (Belum dikonfigurasi)**: Belum ada *testing framework* seperti Jest, Vitest, atau Playwright yang terpasang di `package.json`.

## 6. Command Build
- `npm run build` — Melakukan *production build* (`next build`)
- `npm start` — Menjalankan *production server* (`next start`)

## 7. Konfigurasi yang Sudah Tersedia
- **TypeScript**: Dikonfigurasi dengan strict mode (`tsconfig.json`)
- **Tailwind CSS v4**: Dikonfigurasi via PostCSS (`postcss.config.mjs` & `@tailwindcss/postcss`)
- **ESLint**: Flat config (`eslint.config.mjs`) terintegrasi dengan Next.js Core Web Vitals & TypeScript
- **Next.js**: Standar bawaan (`next.config.ts`)

## 8. Bagian yang Masih Kosong
- **Database & ORM**: Belum ada koneksi database, ORM (Prisma/Drizzle), atau migration tool.
- **Autentikasi**: Belum ada *library* auth (NextAuth / Auth.js, Lucia, JWT, dll.).
- **Testing Suite**: Belum ada *unit/integration/E2E test setup*.
- **Modul Bisnis (BadmintonKu)**: Belum ada skema data untuk lapangan, jadwal, booking, pembayaran, atau integrasi WhatsApp.

## 9. Potensi Masalah Arsitektur
- **Belum Ada State/Data Persistence Layer**: Saat ini aplikasi murni template kosong Next.js, sehingga seluruh logika *booking*, *slot management*, dan *payment verification* harus dirancang dari nol.
- **Pemisahan Role (User vs Admin)**: Belum ada struktur direktori untuk membedakan rute publik (*user*) dan rute privat (*admin*), berisiko tercampur jika tidak direncanakan dengan *route groups* (misal: `app/(user)/` dan `app/(admin)/`) sejak dini.
- **Ketiadaan Test Runner**: Tanpa *testing framework*, verifikasi logika *booking overlap* (bentrok jadwal 3 lapangan) berisiko tinggi mengalami *race condition* jika tidak diantisipasi lewat *database locking* atau *transaction isolation* nantinya.
