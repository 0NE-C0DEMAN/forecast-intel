# Forecast Intel — Monthly Inventory Predictions

**Live demo:** <https://forecast-intel.streamlit.app/>

A Streamlit web app that wraps an existing inventory re-forecasting ML model with an interactive dashboard. Built for operations / supply-chain planners reviewing monthly closing-balance predictions and per-item Deliver / Return / No-Change recommendations across construction-equipment SKUs.

The app is **password-gated**: a custom React/Babel login screen sits in front of the dashboard and reads the expected password from `st.secrets` (see *Configuration* below).

**Data source:** the live forecast database is **Supabase** — the app reads `forecast_runs` + `forecast_predictions` tables directly via the anon key. A sidebar run picker lets the user switch between forecast runs (Future and Backtest). The bundled Excel is still supported as a fallback (used automatically if Supabase creds are missing or the DB is unreachable) and uploaded Excel/CSV files still work via the data-source modal.

## What it does

- Reads forecast runs from **Supabase** (`forecast_runs` + `forecast_predictions`) by default; falls back to an Excel `Monthly_Predictions` sheet (or matching CSV) if Supabase is unavailable.
- The sidebar exposes a **Forecast Run picker** showing every run in Supabase with mode (Future/Backtest), predict year, item count, and average MAPE. Picking a run swaps the dashboard in place.
- Renders a six-page navigation with deep analytics on each:

### Pages

- **Line Items** — sortable, paginated, action-filterable table of every per-period row, with HV-only filter and direction match/mismatch toggles.
- **Predictions** — four tabs over a single period:
  - **Overview** — KPI strip + action mix donut + HV vs Standard split + closing-balance summary + Top 10 deliver / return movers.
  - **Movement & Trends** — action counts per period, HV vs Standard counts per action, net inventory volumes per period, top items by cumulative movement, period-to-period shifts, Action Flow Sankey.
  - **Distribution** — ABC tier × action heatmap, balance-bracket action density, action × quantity-magnitude grid, previous → predicted balance scatter.
  - **Insights** — auto-generated narrative cards plus stock-out / excess / persistent-pattern watchlist split by criticality.
- **Model Accuracy** — Direction Accuracy ring, MAPE distribution split into Standard items vs High-Value items (with editable bucket thresholds), Portfolio Predicted vs Actual closing-balance series, and the workbook's MAPE Summary table.
- **Item Forecasts** — a card grid (one card per SKU) showing the multi-period forecast trajectory and recent actuals for each item, with per-period APE labels and an x-axis-only zoom.
- **Item Explorer** — search any SKU, drill into its detail panel with cohort tagging (always-deliver / always-return / volatile / dormant / at-risk / stable). The frozen Item column has a scroll-aware mask that prevents partial cells from bleeding past the sticky boundary.
- **Upload Data** — drop a new Excel/CSV; the dashboard re-renders against it. Only the Monthly sheet is read; if the file also has a `MAPE_Summary` sheet, the monthly rows from it are picked up too.

Every chart card has a maximize button that pops it into a larger modal.

## Project structure

```
.
├── app.py                                              # Streamlit entry point (login + bridge + dashboard render)
├── requirements.txt
├── .streamlit/
│   ├── config.toml
│   └── secrets.toml                                    # gitignored — holds the gate password locally
├── design_ref/
│   ├── Monthly Predictions v3.html                     # React UI shell loaded into the iframe
│   ├── tweaks-panel.jsx
│   └── components/
│       ├── sidebar.jsx
│       ├── charts.jsx
│       ├── explorer.jsx
│       ├── insights.jsx
│       ├── upload.jsx
│       └── datasource.jsx
└── Forecast_26_Jan_Feb_Results_v4.xlsx                 # Bundled forecast data (default source)
```

## How the architecture works

- **Python side** (`app.py`)
  - Reads `Monthly_Predictions` and `MAPE_Summary` from the bundled Excel on startup.
  - Parses each sheet into JSON records that match the field names the React UI expects (`itemCode`, `predictedAction`, `error`, `directionCorrect`, `itemMape`, etc.).
  - Inlines all JSX/HTML files into a single self-contained HTML document and serves it via `st.components.v1.html` as a full-viewport iframe.
  - A hidden `st.file_uploader` lives off-screen and acts as a one-way bridge: React drop zones inject files into it via `DataTransfer`, Streamlit re-runs, parses the upload, and rebuilds the iframe with new data + MAPE summary.
  - A sentinel filename (`__RESET_TO_BUNDLED__.csv`) signals a reset to bundled data through the same channel.
  - Server-side validation errors are surfaced inside the iframe as a toast.
- **React side** (`design_ref/`)
  - React 18 + Babel-standalone (in-browser JSX compile) loaded from unpkg.
  - All visualisations are hand-rolled SVGs (no chart library) so the design is fully controllable.
  - Periods are auto-detected from the data; charts that need ≥2 periods (Sankey, period-to-period shifts) gracefully fall back when not available.
  - Mobile-responsive: under 900 px viewport the sidebar collapses, multi-column grids reflow, and the tab strip becomes horizontally scrollable.

## Run locally

```powershell
pip install -r requirements.txt
# Set the gate password (skip this only if you want to wire it up later)
mkdir .streamlit -ErrorAction SilentlyContinue
'password = "demo123"' | Out-File -Encoding utf8 .streamlit\secrets.toml
streamlit run app.py
```

Open <http://localhost:8501>.

## Configuration

Both the gate password and the Supabase credentials live in `st.secrets`. Locally, put them in `.streamlit/secrets.toml`; on Streamlit Cloud, paste the same block into **Settings → Secrets**.

```toml
# .streamlit/secrets.toml
password     = "your-password"

# Supabase forecast database (provided by the Tecscon dev team).
supabase_url = "https://fittcpfhqdsjkrcfdvda.supabase.co"
supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."   # anon key
```

The password may also be scoped under a section if you prefer:

```toml
[auth]
password = "your-password"
```

**Password gate.** The login screen is a self-contained React/Babel iframe matching the dashboard theme (Outfit font, indigo gradient logo, lock icon, password show/hide, animated rise + shake on error). The password is submitted through the host `file_uploader` bridge using a sentinel filename, so no extra Streamlit widgets leak through to the dashboard.

**Supabase fallback.** If `supabase_url` or `supabase_key` is missing — or the DB call fails — the app silently falls back to the bundled Excel and surfaces a non-fatal banner so you know why.

## Upload format

The `Monthly_Predictions` sheet (or any sheet whose name contains "month", or a single-sheet CSV) must have these 18 columns (v4 schema):

`Item Code · Item Description · Is HV · Tier · Period · Prev Closing Balance · Predicted Closing Bal · Actual Closing Bal · Diff of Actual to Prediction · Difference · Predicted Action · Actual Action · Direction Correct · Quantity · Bias Correction Applied · APE (%) · Item MAPE (%) · Months in MAPE`

`Period` is `YYYY-MM`. Actuals-dependent columns (`Actual Closing Bal`, `Actual Action`, `Direction Correct`, `Diff of Actual to Prediction`, `APE (%)`, `Item MAPE (%)`) may be NaN in future-mode files. The dashboard handles future-mode and backtest-mode states automatically — Model Accuracy visuals light up as soon as actuals are present.

**Legacy compatibility:** older files using `Error` instead of `Diff of Actual to Prediction` are still accepted (the column is renamed on parse). `Bias Correction Applied`, `APE (%)`, and `Months in MAPE` are v4-only and may be absent in pre-v4 uploads.

A separate `MAPE_Summary` sheet with columns `Period · Model · MAPE All Items (%) · MAPE HV Items (%) · Items Predicted · Items Deliver · Items Return · Tier` is optional but recommended — its monthly rows feed the MAPE Summary card on the Model Accuracy page.

## Deployment

Streamlit Cloud or any container host with Python 3.10+. The app pulls React/Babel from unpkg.com so the host needs outbound HTTPS. Set the gate password under **Settings → Secrets** before sharing the link.

## Roadmap

- Persist uploaded files across sessions (currently session-state only).
- Bundle React/Babel locally for offline use.
- Connect to Google Sheets / database sources directly (UI exists in `DataSourceModal`).

## Versions

- **v3** — Supabase as the primary data source. Sidebar Forecast Run picker lets the user switch between Future/Backtest runs; the dashboard re-renders against the chosen run. Excel remains as a fallback when Supabase is unreachable or creds are missing.
- **v2** — v4 schema swap (Bias Correction, APE, Months in MAPE), password gate with custom JSX login, six-page navigation (Line Items + Predictions + Model Accuracy + Item Forecasts + Item Explorer + Upload), MAPE split into Standard/HV cards with editable bucket thresholds, per-period APE in Item Forecasts, frozen-column scroll-through fix in Item Explorer.
- **v1** — initial release.
