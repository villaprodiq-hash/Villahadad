---
name: better-auth
description: Implement authentication and authorization with Better Auth - a framework-agnostic TypeScript authentication framework. Features include email/password authentication with verification, OAuth providers (Google, GitHub, Discord, etc.), two-factor authentication (TOTP, SMS), passkeys/WebAuthn support, session management, role-based access control (RBAC), rate limiting, and database adapters. Use when adding authentication to applications, implementing OAuth flows, setting up 2FA/MFA, managing user sessions, configuring authorization rules, or building secure authentication systems for web applications.
license: MIT
version: 2.0.0
---

# Better Auth Skill

Better Auth is comprehensive, framework-agnostic authentication/authorization framework for TypeScript with built-in email/password, social OAuth, and powerful plugin ecosystem for advanced features.

## When to Use

- Implementing auth in TypeScript/JavaScript applications
- Adding email/password or social OAuth authentication
- Setting up 2FA, passkeys, magic links, advanced auth features
- Building multi-tenant apps with organization support
- Managing sessions and user lifecycle
- Working with any framework (Next.js, Nuxt, SvelteKit, Remix, Astro, Hono, Express, etc.)

## Quick Start

### Installation

```bash
npm install better-auth
# or pnpm/yarn/bun add better-auth
```

### Environment Setup

Create `.env`:
```env
BETTER_AUTH_SECRET=<generated-secret-32-chars-min>
BETTER_AUTH_URL=http://localhost:3000
```

### Basic Server Setup

Create `auth.ts` (root, lib/, utils/, or under src/app/server/):

```ts
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: {
    // See references/database-integration.md
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }
  }
});
```

### Database Schema

```bash
npx @better-auth/cli generate  # Generate schema/migrations
npx @better-auth/cli migrate   # Apply migrations (Kysely only)
```

### Client Setup

Create `auth-client.ts`:

```ts
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"
});
```

### Basic Usage

```ts
// Sign up
await authClient.signUp.email({
  email: "user@example.com",
  password: "secure123",
  name: "John Doe"
});

// Sign in
await authClient.signIn.email({
  email: "user@example.com",
  password: "secure123"
});

// OAuth
await authClient.signIn.social({ provider: "github" });

// Session
const { data: session } = authClient.useSession(); // React/Vue/Svelte
const { data: session } = await authClient.getSession(); // Vanilla JS
```

## Feature Selection Matrix

| Feature | Plugin Required | Use Case |
|---------|----------------|----------|
| Email/Password | No (built-in) | Basic auth |
| OAuth (GitHub, Google, etc.) | No (built-in) | Social login |
| Email Verification | No (built-in) | Verify email addresses |
| Password Reset | No (built-in) | Forgot password flow |
| Two-Factor Auth (2FA/TOTP) | Yes (`twoFactor`) | Enhanced security |
| Passkeys/WebAuthn | Yes (`passkey`) | Passwordless auth |
| Magic Link | Yes (`magicLink`) | Email-based login |
| Username Auth | Yes (`username`) | Username login |
| Organizations/Multi-tenant | Yes (`organization`) | Team/org features |
| Rate Limiting | No (built-in) | Prevent abuse |
| Session Management | No (built-in) | User sessions |

## Implementation Checklist

- [ ] Install `better-auth` package
- [ ] Set environment variables (SECRET, URL)
- [ ] Create auth server instance with database config
- [ ] Run schema migration (`npx @better-auth/cli generate`)
- [ ] Mount API handler in framework
- [ ] Create client instance
- [ ] Implement sign-up/sign-in UI
- [ ] Add session management to components
- [ ] Set up protected routes/middleware
- [ ] Add plugins as needed (regenerate schema after)
- [ ] Test complete auth flow
- [ ] Configure email sending (verification/reset)
- [ ] Enable rate limiting for production
- [ ] Set up error handling

## Resources

- Docs: https://www.better-auth.com/docs
- GitHub: https://github.com/better-auth/better-auth
- Plugins: https://www.better-auth.com/docs/plugins
- Examples: https://www.better-auth.com/docs/examples
