# Forecast Intel — Monthly Inventory Predictions

A Streamlit web app that wraps an existing inventory re-forecasting ML model with an interactive dashboard. Built for operations / supply-chain planners reviewing monthly closing-balance predictions and per-item Deliver / Return / No-Change recommendations across construction-equipment SKUs.

## What it does

- Reads a Monthly_Predictions sheet from an Excel workbook (or a CSV).
- Renders a five-tab analytics dashboard inside a Streamlit page:
  - **Overview** — KPI strip + action mix donut + HV vs Standard split + closing-balance summary + Top 10 deliver / return movers.
  - **Movement & Trends** — action counts per period, net inventory volumes, HV vs Standard split per period, top high-velocity items, action flow Sankey, model accuracy table.
  - **Distribution** — quantity distribution histogram, action × magnitude heatmap, balance scatter (previous → predicted).
  - **Insights** — auto-generated narrative cards, stock-out / excess risk watch, ABC Pareto, action calendar heatmap, year-over-year comparison.
  - **Line Items** — sortable, paginated, action-filterable table of every line.
- **Item Explorer** — search any SKU, drill into its detail panel with cohort tagging.
- **Upload Data** — drop a new Excel/CSV; the dashboard re-renders against the new dataset; only the Monthly sheet is read.
- Every chart card has a maximize button that pops the chart into a larger modal.

## Project structure

```
.
├── app.py                                 # Streamlit entry point
├── requirements.txt
├── .streamlit/
│   └── config.toml
├── design_ref/
│   ├── Monthly Predictions v3.html        # Main React UI shell (loaded into the iframe)
│   ├── tweaks-panel.jsx
│   └── components/
│       ├── sidebar.jsx
│       ├── charts.jsx
│       ├── explorer.jsx
│       ├── insights.jsx
│       ├── upload.jsx
│       └── datasource.jsx
└── Re_Forecast_2026_JanFeb_train24_25.xlsx   # Bundled forecast data (default source)
```

## How the architecture works

- **Python side** (`app.py`)
  - Reads the bundled Excel on startup, parses `Monthly_Predictions` into JSON records that match the field names the React UI expects (`itemCode`, `predictedAction`, `prevClosingBal`, etc.).
  - Inlines the JSX/HTML files into a single self-contained HTML document and serves it via `st.components.v1.html` as a full-viewport iframe.
  - A hidden `st.file_uploader` lives off-screen and acts as a one-way bridge: React drop zones inject files into it via `DataTransfer`, Streamlit reruns, parses the upload, and rebuilds the iframe with new data.
  - A sentinel filename (`__RESET_TO_BUNDLED__.csv`) signals a reset to bundled data through the same channel.
  - Server-side validation errors are surfaced inside the iframe as a toast.
- **React side** (`design_ref/`)
  - React 18 + Babel-standalone (in-browser JSX compile) loaded from unpkg.
  - All visualisations are hand-rolled SVGs (no chart library) so the design is fully controllable.
  - Periods are auto-detected from the data; charts that need ≥2 periods (year-over-year, Sankey) gracefully fall back when not available.

## Run locally

```powershell
pip install -r requirements.txt
streamlit run app.py
```

Open <http://localhost:8501>.

## Upload format

The Monthly_Predictions sheet (or any sheet whose name contains "month", or a single-sheet CSV) must have these 14 columns:

`Item Code · Item Description · Is HV · Tier · Period · Prev Closing Balance · Predicted Closing Bal · Actual Closing Bal · Difference · Predicted Action · Actual Action · Direction Correct · Quantity · Item MAPE (%)`

`Period` is `YYYY-MM`. `Actual Closing Bal`, `Direction Correct`, `Item MAPE (%)` may be NaN (future mode). The dashboard handles future-mode and backtest-mode states automatically — Model Accuracy and direction-correct visuals light up as soon as actuals are present.

## Deployment

Streamlit Cloud or any container host with Python 3.10+. The app pulls React/Babel from unpkg.com so the host needs outbound HTTPS.

## Roadmap

- Persist uploaded files across sessions (currently session-state only).
- Bundle React/Babel locally for offline use.
- Connect to Google Sheets / database sources directly (UI exists in `DataSourceModal`).

## Version

v1 — initial release.
