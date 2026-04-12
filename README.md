# 💅 Nail Booking Pro — Backend API

Node.js + Express + TypeScript + Prisma + SQL Server

---

## ⚡ Quick Start

### Prerequisites
- Node.js >= 18
- SQL Server (local or Docker)
- npm

### 1. Install dependencies
```bash
cd nail-booking-pro-api
npm install
```

### 2. Setup environment
```bash
cp .env.example .env
# Edit .env — fill in DATABASE_URL, JWT_SECRET, SMTP_*
```

### 3. SQL Server via Docker (nếu chưa có)
```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourPassword123!" \
  -p 1433:1433 --name sqlserver -d \
  mcr.microsoft.com/mssql/server:2022-latest
```

### 4. Push schema & seed data
```bash
npm run db:push
npm run db:seed
```

### 5. Start dev server
```bash
npm run dev
```

Server runs at **http://localhost:4000**

---

## 📡 API Endpoints

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| POST | `/api/v1/auth/register` | ❌ | Register |
| POST | `/api/v1/auth/login` | ❌ | Login |
| GET | `/api/v1/auth/me` | ✅ | Current user |
| GET | `/api/v1/services` | ❌ | All services |
| POST | `/api/v1/services` | ADMIN | Create service |
| PATCH | `/api/v1/services/:id` | ADMIN | Update service |
| DELETE | `/api/v1/services/:id` | ADMIN | Deactivate service |
| GET | `/api/v1/staff` | ❌ | All staff |
| POST | `/api/v1/bookings` | ✅ | Create booking |
| GET | `/api/v1/bookings/mine` | ✅ | My bookings |
| PATCH | `/api/v1/bookings/:id/cancel` | ✅ | Cancel booking |
| GET | `/api/v1/bookings` | ADMIN/STAFF | All bookings |
| PATCH | `/api/v1/bookings/:id/status` | ADMIN/STAFF | Update status |
| GET | `/health` | ❌ | Health check |

---

## 🧪 Test with curl

```bash
# Register
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"123456"}'

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'

# Get services
curl http://localhost:4000/api/v1/services
```

---

## 🗂 Project Structure

```
src/
├── config/       # env, database (Prisma)
├── controllers/  # route handlers + zod validation
├── middleware/   # authenticate, authorize, errorHandler
├── routes/       # express routers
├── services/     # email service (nodemailer)
├── types/        # AuthRequest, ApiResponse
├── app.ts        # express setup (helmet, cors, morgan, rate-limit)
└── server.ts     # entry point — connect DB then listen
prisma/
├── schema.prisma # User, Staff, Service, Booking models
└── seed.ts       # seed admin + services + staff
```

---

## 🔑 Admin credentials (after seed)
- Email: `admin@kingnails.co.uk`
- Password: `admin123`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript → dist/ |
| `npm run start` | Run compiled production build |
| `npm run db:push` | Push schema to DB (no migration file) |
| `npm run db:migrate` | Create & run migration |
| `npm run db:studio` | Open Prisma Studio UI |
| `npm run db:seed` | Seed initial data |


## Features
- User authentication and authorization
- CRUD operations for bookings, services, and staff
- Email notifications for booking confirmations
- Middleware for error handling and request validation

## Technologies
- Node.js
- Express
- TypeScript
- Prisma (for SQL Server)
- dotenv (for environment variable management)

## Project Structure
```
nail-booking-pro-api
├── src
│   ├── server.ts                # Entry point of the application
│   ├── app.ts                   # Express application configuration
│   ├── config
│   │   ├── database.ts          # Database connection logic
│   │   └── env.ts               # Environment variable configuration
│   ├── controllers
│   │   ├── booking.controller.ts # Booking-related request handlers
│   │   ├── service.controller.ts # Service management request handlers
│   │   ├── staff.controller.ts   # Staff management request handlers
│   │   └── auth.controller.ts    # User authentication request handlers
│   ├── routes
│   │   ├── index.ts              # Main routing setup
│   │   ├── booking.routes.ts      # Booking routes
│   │   ├── service.routes.ts      # Service routes
│   │   ├── staff.routes.ts        # Staff routes
│   │   └── auth.routes.ts         # Authentication routes
│   ├── models
│   │   ├── booking.model.ts       # Booking model schema
│   │   ├── service.model.ts       # Service model schema
│   │   ├── staff.model.ts         # Staff model schema
│   │   └── user.model.ts          # User model schema
│   ├── middleware
│   │   ├── auth.middleware.ts     # Authentication middleware
│   │   ├── error.middleware.ts    # Error handling middleware
│   │   └── validate.middleware.ts  # Request validation middleware
│   ├── services
│   │   ├── booking.service.ts     # Business logic for bookings
│   │   ├── email.service.ts       # Email handling service
│   │   └── auth.service.ts        # Authentication logic
│   └── types
│       └── index.ts               # TypeScript types and interfaces
├── prisma
│   ├── schema.prisma              # Prisma schema definition
│   └── migrations
│       └── .gitkeep               # Keep migrations directory in version control
├── .env.example                    # Example environment variables
├── package.json                    # npm configuration
├── tsconfig.json                  # TypeScript configuration
└── README.md                       # Project documentation
```

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- SQL Server
- npm or yarn

### Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd nail-booking-pro-api
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your environment variables:
   - Copy `.env.example` to `.env` and fill in the required values.

4. Set up the database:
   - Configure your SQL Server connection in `src/config/database.ts`.
   - Run Prisma migrations:
   ```
   npx prisma migrate dev --name init
   ```

### Running the Application
To start the server, run:
```
npm run start
```

### API Documentation
Refer to the individual controller files for detailed API endpoints and usage.

## License
This project is licensed under the MIT License. See the LICENSE file for details.