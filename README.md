# Pallet POS - Playwright Smoke Tests

Automated smoke tests for the [Pallet POS](https://upcoming-pos.palletnow.co) application using Playwright and TypeScript.

## Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run install:browsers

# Copy environment file and update with your credentials
cp .env.example .env
```

## Configuration

Edit `.env` with your POS credentials:

```
BASE_URL=https://upcoming-pos.palletnow.co
POS_USERNAME=your_mobile_number
POS_PIN=your_pin
```

## Running Tests

```bash
# Run all smoke tests (runs auth setup first, then all tests)
npm run test:all

# Run only the smoke test suite (requires auth-state.json to exist)
npm test

# Run individual test suites
npm run test:login       # Login page tests
npm run test:homepage    # Homepage/Dashboard tests
npm run test:catalog     # Product catalog tests
npm run test:kds         # Kitchen Display System tests
npm run test:orders      # Orders page tests
npm run test:returns     # Returns page tests
npm run test:session     # Session listing tests
npm run test:navigation  # Sidebar navigation tests
npm run test:pages       # All pages load check

# View HTML report
npm run report
```

## Project Structure

```
pallet-pos-tests/
├── playwright.config.ts          # Playwright configuration
├── .env                          # Environment variables (credentials)
├── .env.example                  # Example env file
├── tests/
│   ├── auth.setup.ts             # Authentication setup (runs before tests)
│   ├── fixtures/
│   │   └── pages.ts              # Page route definitions
│   └── smoke/
│       ├── login.smoke.spec.ts           # Login page smoke tests
│       ├── homepage.smoke.spec.ts        # Dashboard smoke tests
│       ├── product-catalog.smoke.spec.ts # Product catalog smoke tests
│       ├── kitchen-display.smoke.spec.ts # KDS smoke tests
│       ├── orders.smoke.spec.ts          # Orders page smoke tests
│       ├── returns.smoke.spec.ts         # Returns page smoke tests
│       ├── session.smoke.spec.ts         # Session listing smoke tests
│       ├── navigation.smoke.spec.ts      # Sidebar navigation smoke tests
│       └── pages-load.smoke.spec.ts      # All pages load verification
```

## Triggering Tests via Slack

Use the `/playwright` slash command in Slack to trigger a test run:

| Slack Command | Runs |
|---|---|
| `/playwright` | All tests |
| `/playwright sanity` | All sanity tests |
| `/playwright smoke` | All smoke tests |
| `/playwright sanity-cart` | Sanity cart tests only |
| `/playwright sanity-login` | Sanity login tests only |
| `/playwright smoke-cart` | Smoke cart tests only |
| `/playwright smoke-login` | Smoke login tests only |
| `/playwright sanity firefox` | All sanity tests on Firefox |

Results are posted back to the Slack channel after the run completes.

## Pages Covered

| Page               | Route                                |
|--------------------|--------------------------------------|
| Login              | `/`                                  |
| Homepage/Dashboard | `/products/homepage`                 |
| Product Catalog    | `/products/particularcategorypage`   |
| Kitchen Display    | `/products/kitchen-display`          |
| Orders             | `/products/orderstable`              |
| Returns            | `/products/returns`                  |
| Delivery           | `/products/delivery`                 |
| Expenses           | `/products/expenses`                 |
| Inventory          | `/products/inventory`                |
| Logistics          | `/logistics`                         |
| Hold Orders        | `/products/holdorderpage`            |
| Session Listing    | `/session-page/session-listing`      |
