# Forecast Intel — Monthly Inventory Predictions

**Live demo:** <https://forecast-intel.streamlit.app/>

A Streamlit web app that wraps an existing inventory re-forecasting ML model with an interactive dashboard. Built for operations / supply-chain planners reviewing monthly closing-balance predictions and per-item Deliver / Return / No-Change recommendations across construction-equipment SKUs.

## What it does

- Reads a `Monthly_Predictions` sheet plus a `MAPE_Summary` sheet from an Excel workbook (or a CSV with the monthly columns).
- Renders a four-page navigation with deep analytics across each:

### Pages

- **Monthly Predictions** — six tabs:
  - **Overview** — KPI strip + action mix donut + HV vs Standard split + closing-balance summary + Top 10 deliver / return movers.
  - **Movement & Trends** — action counts per period, HV vs Standard counts per action, net inventory volumes per period, top items by cumulative movement, period-to-period shifts, Action Flow Sankey.
  - **Distribution** — ABC tier × action heatmap, balance-bracket action density, action × quantity-magnitude grid, previous → predicted balance scatter.
  - **Insights** — auto-generated narrative cards plus stock-out / excess / persistent-pattern watchlist split by criticality.
  - **Model Accuracy** — Portfolio Predicted vs Actual closing-balance series, Direction Accuracy ring, per-item MAPE distribution histogram, and the workbook's MAPE Summary table.
  - **Line Items** — sortable, paginated, action-filterable table of every line.
- **Item Forecasts** — a card grid (one card per SKU) showing the multi-period forecast trajectory and recent actuals for each item.
- **Item Explorer** — search any SKU, drill into its detail panel with cohort tagging (always-deliver / always-return / volatile / dormant / at-risk / stable).
- **Upload Data** — drop a new Excel/CSV; the dashboard re-renders against it. Only the Monthly sheet is read; if the file also has a `MAPE_Summary` sheet, the monthly rows from it are picked up too.

Every chart card has a maximize button that pops it into a larger modal.

## Project structure

```
.
├── app.py                                              # Streamlit entry point
├── requirements.txt
├── .streamlit/
│   └── config.toml
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
└── Forecast_26_Jan_Feb_Results_train24_25_fixed.xlsx   # Bundled forecast data (default source)
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
streamlit run app.py
```

Open <http://localhost:8501>.

## Upload format

The `Monthly_Predictions` sheet (or any sheet whose name contains "month", or a single-sheet CSV) must have these 15 columns:

`Item Code · Item Description · Is HV · Tier · Period · Prev Closing Balance · Predicted Closing Bal · Actual Closing Bal · Error · Difference · Predicted Action · Actual Action · Direction Correct · Quantity · Item MAPE (%)`

`Period` is `YYYY-MM`. `Actual Closing Bal`, `Actual Action`, `Direction Correct`, `Error`, and `Item MAPE (%)` may be NaN (future mode). The dashboard handles future-mode and backtest-mode states automatically — Model Accuracy visuals (portfolio predicted vs actual, direction accuracy ring, MAPE distribution, MAPE summary table) light up as soon as actuals are present.

A separate `MAPE_Summary` sheet with columns `Period · Model · MAPE All Items (%) · MAPE HV Items (%) · Items Predicted · Items Deliver · Items Return · Tier` is optional but recommended — its monthly rows feed the MAPE Summary card on the Model Accuracy tab.

## Deployment

Streamlit Cloud or any container host with Python 3.10+. The app pulls React/Babel from unpkg.com so the host needs outbound HTTPS.

## Roadmap

- Persist uploaded files across sessions (currently session-state only).
- Bundle React/Babel locally for offline use.
- Connect to Google Sheets / database sources directly (UI exists in `DataSourceModal`).

## Version

v1 — initial release.
