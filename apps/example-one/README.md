# ShortLink

A modern URL shortener built with Hono and Toolless database.

## Features

- **User Authentication**: Secure signup and login with bcrypt password hashing
- **URL Shortening**: Create short, memorable links with optional custom codes
- **Click Tracking**: Monitor link performance with click analytics
- **Responsive Dashboard**: Clean, Vercel-inspired UI that works on all devices
- **Fast & Reliable**: Built on Hono for lightning-fast responses

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)

### Installation

```bash
# From the monorepo root
pnpm install

# Navigate to the app
cd apps/example-one

# Start development server
pnpm dev
```

The application will be available at `http://localhost:3000`

### Production Build

```bash
pnpm build
pnpm start
```

## Usage

1. **Sign Up**: Create an account at `/register`
2. **Create Links**: Use the dashboard to create shortened URLs
3. **Track Performance**: View click counts for all your links
4. **Share**: Copy and share your short links

## Tech Stack

- **Framework**: [Hono](https://hono.dev/) - Ultrafast web framework
- **Database**: [Toolless](../../packages/toolless) - File-based document database
- **Authentication**: bcryptjs for password hashing
- **ID Generation**: nanoid for short codes
- **UI**: Custom Vercel-inspired design system

## Project Structure

```
src/
├── lib/           # Core business logic
│   ├── db.ts      # Database setup and types
│   ├── auth.ts    # Authentication functions
│   └── links.ts   # Link management
├── middleware/    # Hono middleware
│   └── auth.ts    # Auth middleware
├── routes/        # Route handlers
│   ├── home.ts    # Landing page
│   ├── auth.ts    # Login/register/logout
│   ├── dashboard.ts # Dashboard CRUD
│   └── redirect.ts  # Short link redirects
├── views/         # HTML templates
│   ├── layout.ts  # Base layout and nav
│   ├── home.ts    # Landing page
│   ├── auth.ts    # Auth pages
│   └── dashboard.ts # Dashboard page
└── index.ts       # App entry point
```

## Environment Variables

- `PORT` - Server port (default: 3000)

## Database

The application uses Toolless, a lightweight file-based database. Data is stored in `./data/shortlink.tdb/` with collections for:

- `users` - User accounts
- `links` - Shortened links
- `sessions` - Authentication sessions

All collections have appropriate indexes for optimal query performance.

## License

MIT
