# TrueVow Customer Portal - Agent Rules

These rules apply to all agents working on the TrueVow Customer Portal.

## Architecture Rules

1. **Always validate against architecture**: Before implementing any feature, check `ARCHITECTURE_DECISION.md` and `COMPLETE_CUSTOMER_PORTAL_FEATURES.md` to ensure the change aligns with the existing architecture.

2. **Follow the three-mode workflow**:
   - **Architect** plans first
   - **Coder** implements the plan
   - **QA** validates and commits

3. **No breaking changes**: Never modify existing API contracts without updating all consumers.

4. **Type safety first**: All TypeScript must compile with 0 errors. No `any` types.

## Code Conventions

### File Naming
- Components: PascalCase (`SettleAnalysis.tsx`)
- Hooks: camelCase with `use` prefix (`useFeatureAccess.tsx`)
- API clients: kebab-case (`settle-client.ts`)
- Pages: `page.tsx` in route directories

### React Patterns
- Use `'use client'` for client components
- Functional components only
- Proper loading/error/empty states
- Accessible markup (aria labels, semantic HTML)

### Styling
- Tailwind CSS only
- Dark mode support with `dark:` prefix
- Consistent spacing (use Tailwind scale)

### API Integration
- All external API calls go through Next.js proxy routes
- API clients in `lib/api/` directory
- Types match backend response shapes exactly

## Testing Rules

1. **E2E tests must pass**: All Playwright tests must pass before committing
2. **Use auth bypass**: All dashboard tests must use `?preview=bypass`
3. **Proper wait times**: Use `waitForTimeout(5000)` after navigation, `timeout: 10000` for assertions
4. **Mock API calls**: Use `page.route()` with regex patterns for API mocking
5. **Run sequentially**: Use `--workers=1` for reliable test execution

## Git Rules

1. **Descriptive commits**: Include what changed and why
2. **Stage only intended files**: Never commit secrets or `.env` files
3. **Update documentation**: Keep architecture docs in sync with code changes

## Security Rules

1. **Never commit secrets**: API keys, database URLs, Clerk keys must stay in `.env.local`
2. **No hardcoded credentials**: All sensitive data from environment variables
3. **Input validation**: Validate all user inputs on both client and server

## Phase Implementation Rules

### Phase 2.1 - Confidence Score UI
- Update types in `lib/api/settle-client.ts`
- Add display to analysis and query pages
- Show factor-level detail in expandable section
- Display warnings when present

### Phase 2.2 - Advanced Filter Controls
- Add 9 new optional filter fields to EstimateRequest type
- Add filter controls UI to query page
- Pass filters through to backend
- Include Apply Filters and Clear buttons

### Phase 2.3 - Carrier Patterns Analytics
- Create new page at `/dashboard/settle/carrier-patterns`
- Add `getCarrierPatterns()` method to API client
- Display table with all columns
- Add sidebar navigation link

## Documentation Rules

1. **Update ARCHITECTURE_DECISION.md** when architecture changes
2. **Update COMPLETE_CUSTOMER_PORTAL_FEATURES.md** when features are added
3. **Update CUSTOMER_PORTAL_UPDATE_SUMMARY.md** with recent changes
4. **Keep test documentation current** with test coverage status

## Error Handling

1. **Graceful degradation**: Show useful error messages, not stack traces
2. **Loading states**: Always show loading indicators during async operations
3. **Empty states**: Show helpful messages when no data exists
4. **Retry logic**: Allow users to retry failed operations
