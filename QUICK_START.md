# Quick Start Guide - New Smoke Tests

## What's New?

5 new comprehensive test files with 68+ test cases have been added to your Pallet POS smoke test suite:

1. **form-validation.smoke.spec.ts** - Form input and validation testing
2. **session-auth.smoke.spec.ts** - Session and authentication testing
3. **ui-elements.smoke.spec.ts** - UI components and interactions
4. **performance.smoke.spec.ts** - Load times and performance benchmarks
5. **error-handling.smoke.spec.ts** - Error cases and edge conditions

## Running Tests

### First Time Setup
```bash
# Install dependencies (if not done already)
npm install

# Install Playwright browsers
npm run install:browsers

# Create/verify .env file with credentials
cat .env
# Should contain:
# BASE_URL=https://upcoming-pos.palletnow.co
# POS_USERNAME=7872735817
# POS_PIN=1111
```

### Run All Tests
```bash
npm run test:all
```
This runs the auth setup first, then all smoke tests including the new ones.

### Run Only New Smoke Tests
```bash
npm test
```

### Run Specific Test File
```bash
# Form validation tests
npm test -- tests/smoke/form-validation.smoke.spec.ts

# Session tests
npm test -- tests/smoke/session-auth.smoke.spec.ts

# UI element tests
npm test -- tests/smoke/ui-elements.smoke.spec.ts

# Performance tests
npm test -- tests/smoke/performance.smoke.spec.ts

# Error handling tests
npm test -- tests/smoke/error-handling.smoke.spec.ts
```

### Run Specific Test Suite
```bash
# For example, just the login form validation tests
npm test -- --grep "Login Form Validation"

# Or just form validation tests
npm test -- tests/smoke/form-validation.smoke.spec.ts --grep "should not allow submission"
```

## View Results

### Interactive HTML Report
```bash
npm run report
```
Opens Playwright's interactive HTML report showing test results, traces, and screenshots.

### Command Line Output
Tests print results directly to console during execution.

## Test Structure

Each test file contains multiple test suites (test.describe) organized by functionality:

```
form-validation.smoke.spec.ts
├── Login Form Validation
│   ├── Test 1: Empty submission
│   ├── Test 2: Partial submission
│   └── ...
└── Form State Persistence
    └── Test 8: State persistence

session-auth.smoke.spec.ts
├── Session Management
├── Authentication State
├── Page Access Control
└── ...
```

## Key Facts About Tests

### Performance Benchmarks
- Homepage load: < 15 seconds
- Product catalog load: < 15 seconds
- Orders page load: < 15 seconds
- Navigation: < 10 seconds

### What's Tested
- ✅ Form validation and input handling
- ✅ Authentication and session management
- ✅ UI components and responsiveness
- ✅ Page load performance
- ✅ Error handling and recovery
- ✅ Navigation and layout stability

### Authentication
All tests automatically use the authenticated session saved by `auth.setup.ts`. You don't need to login manually for each test.

## Troubleshooting

### Browsers Not Found
```bash
npm run install:browsers
```

### Tests Fail on Login
Check your `.env` file credentials:
```bash
cat .env
```
Should be:
```
BASE_URL=https://upcoming-pos.palletnow.co
POS_USERNAME=7872735817
POS_PIN=1111
```

### Auth State Invalid
Delete `auth-state.json` and run again:
```bash
rm auth-state.json
npm run test:all
```

### Tests Timeout
Increase timeout in individual tests or globally in `playwright.config.ts`:
```typescript
timeout: 120_000, // 2 minutes
```

## File Locations

```
pallet-pos-tests/
├── tests/
│   ├── smoke/
│   │   ├── login.smoke.spec.ts (existing)
│   │   ├── homepage.smoke.spec.ts (existing)
│   │   ├── form-validation.smoke.spec.ts (NEW)
│   │   ├── session-auth.smoke.spec.ts (NEW)
│   │   ├── ui-elements.smoke.spec.ts (NEW)
│   │   ├── performance.smoke.spec.ts (NEW)
│   │   └── error-handling.smoke.spec.ts (NEW)
│   ├── auth.setup.ts
│   └── fixtures/
│       └── pages.ts
├── playwright.config.ts
├── .env
├── package.json
├── NEW_TESTS_SUMMARY.md (NEW - Detailed documentation)
└── QUICK_START.md (This file)
```

## Common Commands

```bash
# Run all tests
npm run test:all

# Run only smoke tests
npm test

# Run specific category
npm test -- tests/smoke/form-validation.smoke.spec.ts

# Run tests matching pattern
npm test -- --grep "Login Form"

# Run with detailed output
npm test -- --verbose

# Run in headed mode (see browser)
npm test -- --headed

# View report after running tests
npm run report

# Run auth setup only
npm run test:setup
```

## Next Steps

1. **Run the new tests:** `npm test`
2. **View the report:** `npm run report`
3. **Review results:** Check for any failures
4. **Update as needed:** Adjust selectors/timeouts if app changes

## Documentation

For detailed information about:
- All 68+ test cases → See `NEW_TESTS_SUMMARY.md`
- Test configuration → See `playwright.config.ts`
- Page definitions → See `tests/fixtures/pages.ts`
- Authentication setup → See `tests/auth.setup.ts`

## Questions?

Refer to the detailed `NEW_TESTS_SUMMARY.md` file for:
- Complete test case descriptions
- Test organization by category
- Coverage matrix
- Performance benchmarks
- Future enhancement ideas

---

**Happy Testing! 🚀**
