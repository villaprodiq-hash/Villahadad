---
name: supabase-postgres-best-practices
description: Postgres performance optimization and best practices from Supabase. Use this skill when writing, reviewing, or optimizing Postgres queries, schema designs, or database configurations.
license: MIT
version: "1.1.0"
---

# Supabase Postgres Best Practices

Comprehensive performance optimization guide for Postgres, maintained by Supabase. Contains rules across 8 categories, prioritized by impact to guide automated query optimization and schema design.

## When to Apply

Reference these guidelines when:
- Writing SQL queries or designing schemas
- Implementing indexes or query optimization
- Reviewing database performance issues
- Configuring connection pooling or scaling
- Optimizing for Postgres-specific features
- Working with Row-Level Security (RLS)

## Rule Categories by Priority

| Priority | Category | Impact |
|----------|----------|--------|
| 1 | Query Performance | CRITICAL |
| 2 | Connection Management | CRITICAL |
| 3 | Security & RLS | CRITICAL |
| 4 | Schema Design | HIGH |
| 5 | Concurrency & Locking | MEDIUM-HIGH |
| 6 | Data Access Patterns | MEDIUM |
| 7 | Monitoring & Diagnostics | LOW-MEDIUM |
| 8 | Advanced Features | LOW |

## Key Best Practices

### 1. Query Performance (CRITICAL)

**Always use indexes for frequently queried columns:**
```sql
-- Bad: No index on frequently queried column
SELECT * FROM users WHERE email = 'user@example.com';

-- Good: Create index first
CREATE INDEX idx_users_email ON users(email);
```

**Use EXPLAIN ANALYZE to understand query plans:**
```sql
EXPLAIN ANALYZE SELECT * FROM bookings WHERE status = 'pending';
```

### 2. Connection Management (CRITICAL)

**Use connection pooling (Supabase uses PgBouncer):**
- Transaction mode for web apps
- Session mode for migrations/admin tasks
- Max connections based on compute size

### 3. Security & RLS (CRITICAL)

**Always enable RLS on tables with user data:**
```sql
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
ON bookings FOR SELECT
USING (auth.uid() = user_id);
```

### 4. Schema Design (HIGH)

**Use appropriate data types:**
```sql
-- Bad
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  created_at TEXT
);

-- Good
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Use foreign keys for data integrity:**
```sql
ALTER TABLE bookings
ADD CONSTRAINT fk_user
FOREIGN KEY (user_id) REFERENCES users(id);
```

### 5. Partial Indexes

**Create partial indexes for filtered queries:**
```sql
-- Good: Only index active users
CREATE INDEX idx_active_users ON users(email) WHERE is_active = true;
```

### 6. Avoid SELECT *

**Only select columns you need:**
```sql
-- Bad
SELECT * FROM users;

-- Good
SELECT id, name, email FROM users;
```

### 7. Batch Operations

**Use batch inserts/updates:**
```sql
-- Bad: Multiple single inserts
INSERT INTO logs (message) VALUES ('log1');
INSERT INTO logs (message) VALUES ('log2');

-- Good: Batch insert
INSERT INTO logs (message) VALUES ('log1'), ('log2'), ('log3');
```

### 8. Real-time Subscriptions

**Use Supabase real-time wisely:**
```typescript
// Subscribe to specific changes
supabase
  .channel('bookings-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'bookings',
    filter: 'user_id=eq.' + userId
  }, handleChange)
  .subscribe();
```

## Supabase-Specific Tips

1. **Use `supabase.from()` for type-safe queries**
2. **Enable real-time only on tables that need it**
3. **Use Edge Functions for complex operations**
4. **Leverage PostgREST for automatic REST APIs**
5. **Use storage policies for file access control**

## Resources

- https://www.postgresql.org/docs/current/
- https://supabase.com/docs
- https://supabase.com/docs/guides/database/overview
- https://supabase.com/docs/guides/auth/row-level-security
