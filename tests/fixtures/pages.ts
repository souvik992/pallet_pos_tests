/**
 * Page route definitions for the Pallet POS application.
 * Each entry defines a page name, its route, and key elements to verify.
 */
export interface PageDefinition {
  name: string;
  route: string;
  /** Text or element that should be visible when the page loads */
  expectedText?: string;
  /** Selector that should be present on the page */
  expectedSelector?: string;
  /** Timeout override for slow-loading pages */
  timeout?: number;
}

export const PAGES: PageDefinition[] = [
  {
    name: "Homepage / Dashboard",
    route: "/products/homepage",
    expectedText: "Hello",
  },
  {
    name: "Product Catalog",
    route: "/products/particularcategorypage",
    expectedText: "Categories",
  },
  {
    name: "Kitchen Display (KDS)",
    route: "/products/kitchen-display",
    expectedText: "KDS",
  },
  {
    name: "Orders",
    route: "/products/orderstable",
    expectedText: "Orders",
  },
  {
    name: "Returns",
    route: "/products/returns",
    expectedText: "Returns",
  },
  {
    name: "Delivery",
    route: "/products/delivery",
    expectedSelector: "[class*='MuiContainer'], [class*='delivery'], main",
  },
  {
    name: "Expenses",
    route: "/products/expenses",
    expectedSelector: "[class*='MuiContainer'], [class*='expense'], main",
  },
  {
    name: "Inventory",
    route: "/products/inventory",
    expectedSelector: "[class*='MuiContainer'], [class*='inventory'], main",
  },
  {
    name: "Logistics",
    route: "/logistics",
    expectedSelector: "[class*='MuiContainer'], [class*='logistics'], main",
  },
  {
    name: "Hold Orders",
    route: "/products/holdorderpage",
    expectedSelector: "[class*='MuiContainer'], [class*='hold'], main",
  },
  {
    name: "Session Listing",
    route: "/session-page/session-listing",
    expectedText: "Active Sessions",
  },
];
