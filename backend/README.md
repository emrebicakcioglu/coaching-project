# Core Application Backend

Backend API for the Core Application built with Node.js, TypeScript, and Express.

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- PostgreSQL 16.x (for database)
- Resend.com account (for email delivery)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

Run the setup script to create your `.env` file from the template:

```bash
npm run setup
```

This will:
- Copy `.env.example` to `.env`
- Create the `logs/` directory

### 3. Configure Environment

Edit the `.env` file and fill in your configuration values:

**Required Configuration:**

| Variable | Description |
|----------|-------------|
| `DB_PASSWORD` | Your PostgreSQL database password (min 8 chars) |
| `JWT_SECRET` | A secure random string for JWT signing (min 32 chars) |
| `RESEND_API_KEY` | Your Resend.com API key (starts with `re_`) |
| `EMAIL_FROM_ADDRESS` | Your verified sender email address |

**Optional Configuration:**

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment (`development`, `staging`, `production`) |
| `APP_PORT` | `4102` | Port the server listens on |
| `APP_HOST` | `localhost` | Host the server binds to |
| `LOG_LEVEL` | `info` | Logging level (`debug`, `info`, `warn`, `error`) |

### 4. Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:4102`.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run setup` | Initialize `.env` from template |
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production server |
| `npm test` | Run tests with coverage |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |

## Environment Variables

All configuration is managed through environment variables. See `.env.example` for a complete list with descriptions.

### Application

- `NODE_ENV` - Environment name (`development`, `staging`, `production`)
- `APP_PORT` - Server port (default: 4102)
- `APP_HOST` - Server host (default: localhost)
- `APP_URL` - Full application URL

### Database (PostgreSQL)

- `DB_HOST` - Database host
- `DB_PORT` - Database port (default: 5432)
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `DB_SSL` - Enable SSL connection (true/false)

### JWT Authentication

- `JWT_SECRET` - Secret key for signing tokens (min 32 chars)
- `JWT_EXPIRES_IN` - Access token expiration (default: 24h)
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration (default: 30d)

### Email (Resend.com)

- `RESEND_API_KEY` - Resend API key (starts with `re_`)
- `EMAIL_FROM_NAME` - Sender display name
- `EMAIL_FROM_ADDRESS` - Sender email address

### Security

- `BCRYPT_ROUNDS` - Password hashing rounds (default: 12)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in ms (default: 60000)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)

### Logging

- `LOG_LEVEL` - Log level (`debug`, `info`, `warn`, `error`)
- `LOG_FILE_PATH` - Path to log file (default: ./logs/app.log)

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts          # Environment configuration & validation
│   │   └── index.ts        # Config exports
│   └── index.ts            # Application entry point
├── tests/
│   ├── config/
│   │   └── env.test.ts     # Environment config tests
│   ├── scripts/
│   │   └── setup.test.ts   # Setup script tests
│   └── setup.ts            # Jest setup
├── scripts/
│   └── setup.js            # Environment setup script
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
├── jest.config.js          # Jest configuration
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## Security

### Environment Files

- **NEVER** commit `.env` files to version control
- Only `.env.example` should be tracked in Git
- All secrets should be stored in environment variables

### Secret Management

For production deployments, consider using:
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Google Cloud Secret Manager

## Docker

### Environment Variables in Docker

For Docker deployments, environment variables can be passed via:

1. **Docker Compose env_file**:
```yaml
services:
  backend:
    env_file:
      - .env
```

2. **Docker Compose environment**:
```yaml
services:
  backend:
    environment:
      - NODE_ENV=${NODE_ENV}
      - DB_HOST=postgres
```

3. **Docker run**:
```bash
docker run --env-file .env core-app-backend
```

### Port Configuration

| Service | Internal Port | External Port |
|---------|---------------|---------------|
| Backend | 4102 | 4102 |
| PostgreSQL | 5432 | 4103 |
| MinIO API | 9000 | 4104 |
| MinIO Console | 9001 | 4105 |

## Testing

Run tests with coverage:

```bash
npm test
```

Coverage reports are generated in the `coverage/` directory.

### Coverage Requirements

- Branches: >= 85%
- Functions: >= 85%
- Lines: >= 85%
- Statements: >= 85%

## Troubleshooting

### Common Issues

**Error: .env file not found**
```
Run `npm run setup` to create .env from .env.example
```

**Error: Invalid environment variables**
```
Check that all required variables are set in .env
See .env.example for required variables and formats
```

**Error: JWT_SECRET must be at least 32 characters**
```
Generate a secure random string: openssl rand -base64 32
```

**Error: RESEND_API_KEY must start with "re_"**
```
Get your API key from https://resend.com/api-keys
```
