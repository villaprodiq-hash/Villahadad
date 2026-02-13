# 🛡️ RLS Implementation Guide

## Quick Start

### 1. Apply RLS Policies to Supabase

```bash
# Navigate to Supabase SQL Editor
# https://app.supabase.com/project/YOUR_PROJECT/sql

# Copy and paste scripts/rls-policies.sql
# Click "Run" to apply all policies
```

### 2. Update User JWT Tokens

When users log in via Supabase Auth, ensure their JWT includes the `role` in `user_metadata`:

```typescript
// In your login function
const { data, error } = await supabase.auth.signInWithPassword({
  email: user.email,
  password: password,
});

// After login, update user metadata with role
await supabase.auth.updateUser({
  data: {
    role: user.role  // 'admin', 'manager', 'reception', etc.
  }
});
```

### 3. Test RLS Policies

```sql
-- In Supabase SQL Editor, impersonate a role:
SET request.jwt.claims = '{"user_metadata": {"role": "reception"}}';

-- Test: Reception should only see future bookings
SELECT COUNT(*), MIN(shoot_date), MAX(shoot_date) 
FROM bookings;
-- Expected: Only bookings with shoot_date >= TODAY

-- Switch role
SET request.jwt.claims = '{"user_metadata": {"role": "photo_editor"}}';

-- Test: Photo Editor should only see editing bookings
SELECT COUNT(*), ARRAY_AGG(DISTINCT status) 
FROM bookings;
-- Expected: Only 'Editing', 'Ready to Print' statuses
```

### 4. Verify All Roles

| Role | Test Query | Expected Result |
|------|------------|-----------------|
| ADMIN | `SELECT COUNT(*) FROM bookings;` | All bookings |
| MANAGER | `SELECT COUNT(*) FROM bookings;` | All bookings |
| RECEPTION | `SELECT COUNT(*) FROM bookings WHERE shoot_date < CURRENT_DATE;` | 0 rows |
| PHOTO_EDITOR | `SELECT COUNT(*) FROM bookings WHERE status NOT IN ('Editing', 'Ready to Print');` | 0 rows |
| VIDEO_EDITOR | `SELECT COUNT(*) FROM bookings WHERE status NOT IN ('Editing', 'Montage Completed');` | 0 rows |
| PRINTER | `SELECT COUNT(*) FROM bookings WHERE status != 'Ready to Print';` | 0 rows |
| SELECTOR | `SELECT COUNT(*) FROM bookings WHERE status NOT IN ('Selection', 'SELECTION');` | 0 rows |

### 5. Performance Indexes

Create these indexes for optimal RLS performance:

```sql
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_shoot_date ON bookings(shoot_date);
CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON bookings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses(deleted_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
```

## Security Notes

- ✅ **Deny by Default**: All tables have RLS enabled with NO default access
- ✅ **Explicit Grants**: Each policy explicitly defines what each role can access
- ✅ **Multi-Layer**: Policies cover SELECT, INSERT, UPDATE, DELETE separately
- ⚠️ **Remove Client Checks**: After RLS is verified, remove app-level permission checks (they're redundant)

## Troubleshooting

### "No rows returned" for valid user
- Check if JWT includes `user_metadata.role`
- Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
- Check policy: `SELECT * FROM pg_policies WHERE tablename = 'bookings';`

### Performance issues
- Add missing indexes (see above)
- Check query explains: `EXPLAIN ANALYZE SELECT * FROM bookings;`
- Consider materialized views for complex role checks

---

**Status:** ✅ Phase 1 Complete - RLS policies generated and ready for deployment
