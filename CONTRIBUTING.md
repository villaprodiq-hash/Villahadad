# Contributing to Villa Hadad System

Thank you for your interest in contributing to the Villa Hadad Studio Management System!

## Development Setup

### Prerequisites
- Node.js 20+
- npm or yarn
- Git
- macOS (for Electron development)

### Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd villahadad-v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## Code Standards

### TypeScript
- **Strict mode enabled** - All code must pass TypeScript checks
- **No `any` types** - Use proper typing or `unknown`
- **Interfaces over types** - Prefer interfaces for object shapes

### Code Style
- **ESLint** - All code must pass linting (`npm run lint`)
- **Prettier** - All code must be formatted (`npm run format`)
- **Pre-commit hooks** - Husky will auto-format on commit

### File Organization
```
src/
├── components/     # React components
│   ├── [role]/    # Role-specific components
│   └── shared/    # Shared components
├── services/      # Business logic
├── hooks/         # Custom React hooks
├── types/         # TypeScript definitions
└── utils/         # Helper functions
```

### Naming Conventions
- **Components:** PascalCase (`BookingCard.tsx`)
- **Hooks:** camelCase with `use` prefix (`useBookings.ts`)
- **Utils:** camelCase (`formatCurrency.ts`)
- **Types:** PascalCase (`Booking`, `UserRole`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_UPLOAD_SIZE`)

## Git Workflow

### Branch Naming
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates

Example: `feature/add-payment-tracking`

### Commit Messages
Follow conventional commits:
```
type(scope): description

[optional body]
```

Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Maintenance

Example:
```
feat(bookings): add payment method selection

- Added dropdown for Cash/Mastercard/ZainCash
- Updated booking interface
- Added validation
```

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code
   - Add tests if applicable
   - Update documentation

3. **Ensure quality**
   ```bash
   npm run lint        # Check for linting errors
   npm run format      # Format code
   npm run build       # Ensure build succeeds
   npm test            # Run tests
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Testing

### Running Tests
```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

### Writing Tests
- Place tests next to the code they test
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

Example:
```typescript
describe('formatCurrency', () => {
  it('should format IQD currency correctly', () => {
    // Arrange
    const amount = 150000;
    
    // Act
    const result = formatCurrency(amount, 'IQD');
    
    // Assert
    expect(result).toBe('150,000');
  });
});
```

## Code Review Guidelines

### For Reviewers
- Be constructive and respectful
- Focus on code quality, not personal preferences
- Suggest improvements, don't demand them
- Approve if code meets standards

### For Contributors
- Respond to all comments
- Don't take feedback personally
- Ask questions if unclear
- Update PR based on feedback

## Common Tasks

### Adding a New Component
1. Create component file in appropriate directory
2. Define TypeScript interfaces
3. Implement component
4. Add to exports if shared
5. Update documentation

### Adding a New Service
1. Create service file in `src/services/`
2. Define service interface
3. Implement business logic
4. Add error handling
5. Write tests

### Updating Database Schema
1. Create migration in `src/services/db/migrations/`
2. Update Drizzle schema
3. Run migration locally
4. Test thoroughly
5. Document changes

## Performance Guidelines

- **Avoid unnecessary re-renders** - Use `React.memo`, `useMemo`, `useCallback`
- **Lazy load heavy components** - Use `React.lazy` and `Suspense`
- **Optimize images** - Compress before committing
- **Minimize bundle size** - Check bundle analyzer

## Security Guidelines

- **Never commit secrets** - Use environment variables
- **Validate all inputs** - Use Zod schemas
- **Sanitize user data** - Prevent XSS attacks
- **Check permissions** - Verify user roles

## Getting Help

- **Questions?** Open a GitHub Discussion
- **Bug found?** Create an Issue
- **Need clarification?** Ask in PR comments

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to Villa Hadad!** 🎉
