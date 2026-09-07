# Variant Hub

Centralized operations panel for e-commerce, divided into two main zones:
- **CALÇADA** (Attraction): Social media channels (Instagram, Facebook, Telegram, TikTok) driving traffic to WhatsApp
- **LOJA** (Conversion): WhatsApp Business via Evolution API for sales and customer service

## Tech Stack

### Frontend
- React 18+ (TypeScript)
- Vite
- TailwindCSS
- React Router
- Recharts
- Lucide React
- Supabase JS Client

### Backend
- Node.js 18+ (TypeScript)
- Express.js
- Axios
- @supabase/supabase-js
- tsx

### Database
- Supabase (PostgreSQL)

## Project Structure

```
variant-hub/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── db/
│   │   ├── app.ts
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── lib/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── .env.example
└── database/
    └── migration.sql
```

## Setup Instructions

### 1. Database Setup (Supabase)

1. Create a new project in Supabase
2. Run the SQL migration file `database/migration.sql` in the Supabase SQL Editor
3. Get your Supabase URL and Anon Key from the project settings

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your values:
```
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
JWT_SECRET=your_jwt_secret
```

Run the backend:
```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env` with your values:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000/api
```

Run the frontend:
```bash
npm run dev
```

### 4. Evolution API Setup

1. Install and configure the Evolution API
2. Get your API URL, API Key, and Instance Name
3. Configure these in the WhatsApp page in the frontend

## Features

- Real-time integration status for all channels (online/offline)
- WhatsApp integration via Evolution API (no webhooks, no Ngrok)
- Data persistence in Supabase
- Minimalist dark-themed UI
- Responsive design
- No fake data - all data starts zeroed

## Pages

- **Dashboard**: Overview of the entire funnel from CALÇADA to LOJA
- **WhatsApp**: WhatsApp conversations and messages via Evolution API
- **Instagram**: Instagram analytics and performance
- **Facebook**: Facebook analytics and performance
- **Telegram**: Telegram analytics and performance
- **TikTok**: TikTok analytics and performance
- **Store**: Store analytics, sales, and funnel
- **Orders**: Order management and tracking
- **Customers**: Customer management and pipeline
- **Catalog**: Product catalog management
- **Settings**: Integration and API configuration
- **System**: System status and logs

## Notes

- The backend acts as a proxy for the Evolution API, eliminating the need for Ngrok
- All data is stored in Supabase for persistence
- Integration status is checked every 30 seconds via polling
- No fake/demo data is included - all data starts empty
