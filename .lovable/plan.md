# Creator Sales Center - Implementation Plan

## Problem
1. Duplicated/Misplaced Action Bar: In the Creator Studio (`infoprodutos.tsx`), the floating bottom action bar is overlapping UI elements and should be moved to the top header area.
2. Placeholder Sales Experience: The "Sales" tab currently shows an "In soon" message instead of real data.

## Implementation Details

### 1. UI Fix (Action Bar)
- Modify `src/routes/_authenticated.infoprodutos.tsx` to remove the `fixed bottom-8` container.
- Update `ProfileHeader` usage in `CreatorStudioPage` to pass the `PanelActions` component through the `actions` prop.
- Ensure `PanelActions` is correctly positioned in the header on both mobile and desktop.

### 2. Backend / Service Expansion
- Update `src/lib/info-products/v2-monetization.ts` to include real sales data fetching:
  - `getCreatorSalesStats(creatorId, period)`: Aggregates total sales, revenue, average ticket.
  - `getCreatorSalesList(creatorId, filters, pagination)`: Fetches individual transactions with status and customer info.
  - `exportSalesCSV(creatorId, filters)`: Generates CSV data for export.

### 3. Creator Sales Center (UI)
- Replace placeholders in `CreatorStudioPage` with a real dashboard:
  - Metrics Grid: Total Sales, Approved, Pending, Revenue (Gross/Net), etc.
  - Sales Table: ID, Product, Customer, Date, Value, Status, Payment Method.
  - Filters: Today, 7 days, 30 days, Custom period (implemented server-side/RPC).
  - Detail Modal: Shows full transaction details when clicking a sale.

### 4. Database (SQL)
- Create migration `20260813000008_info_sales_center.sql`:
  - Table `info_sales` if not already complete (audit revealed gap).
  - RLS: `creator_id = auth.uid()` for reads.
  - Indexes for performance.

### 5. Quality & Audit
- Execute `src/tests/info-regression-suite.spec.ts`.
- Manual mobile test on Realme C55 simulation.
- Generate `docs/FIXXER_INFO_PRODUCTS_PROMPT_16_AUDIT.md`.

## Technical Details
- Using `supabaseExternal` for all queries.
- Pagination implemented via `range(start, end)`.
- No mocks: if table is empty, show proper empty state.
