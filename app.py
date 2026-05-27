from __future__ import annotations

import io
import json
from datetime import datetime
from pathlib import Path

import pandas as pd
import streamlit as st
from streamlit.components.v1 import html as components_html

ROOT = Path(__file__).parent
DESIGN = ROOT / "design_ref"
DEFAULT_DATA = ROOT / "Forecast_26_Jan_Feb_Results_v4.xlsx"
MONTHLY_SHEET = "Monthly_Predictions"
MAPE_SHEET = "MAPE_Summary"

REQUIRED_COLUMNS = [
    "Item Code",
    "Item Description",
    "Is HV",
    "Tier",
    "Period",
    "Prev Closing Balance",
    "Predicted Closing Bal",
    "Actual Closing Bal",
    "Diff of Actual to Prediction",
    "Difference",
    "Predicted Action",
    "Actual Action",
    "Direction Correct",
    "Quantity",
    "Bias Correction Applied",
    "APE (%)",
    "Item MAPE (%)",
    "Months in MAPE",
]

st.set_page_config(
    page_title="Forecast Intel",
    page_icon=":bar_chart:",
    layout="wide",
    initial_sidebar_state="collapsed",
)


# ---------------------------------------------------------------------------
# Password gate
# ---------------------------------------------------------------------------
def _expected_password() -> str | None:
    """Read the gate password from st.secrets. Supports either top-level
    `password = "..."` or `[auth] password = "..."`."""
    try:
        if "password" in st.secrets:
            return str(st.secrets["password"])
        if "auth" in st.secrets and "password" in st.secrets["auth"]:
            return str(st.secrets["auth"]["password"])
    except Exception:
        pass
    return None


_LOGIN_HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<title>Forecast Intel · Sign in</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>
  :root {
    --accent: #4F46E5;
    --accent-2: #6366F1;
    --accent-3: #818CF8;
    --text: #111827;
    --text-2: #6B7280;
    --text-3: #9CA3AF;
    --border: #E5E7EB;
    --surface: #FFFFFF;
    --surface-2: #F7F8FA;
    --danger: #DC2626;
    --danger-bg: rgba(220,38,38,.06);
    --danger-bd: rgba(220,38,38,.18);
  }
  html, body, #root { margin:0; padding:0; height:100%; min-height:100vh; }
  body {
    font-family: 'Outfit', -apple-system, system-ui, 'Segoe UI', sans-serif;
    color: var(--text);
    background:
      radial-gradient(900px 600px at 12% -10%, rgba(99,102,241,.18), transparent 60%),
      radial-gradient(700px 500px at 110% 110%, rgba(79,70,229,.14), transparent 60%),
      linear-gradient(180deg, #F7F8FA 0%, #EEF2FF 100%);
    overflow: hidden;
  }
  * { box-sizing: border-box; }
  @keyframes lg-spin { to { transform: rotate(360deg); } }
  @keyframes lg-shake {
    0%,100% { transform: translateX(0); }
    20% { transform: translateX(-7px); }
    40% { transform: translateX(7px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  @keyframes lg-rise {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .lg-shake { animation: lg-shake .42s; }
  .lg-card { animation: lg-rise .38s ease-out both; }
  ::placeholder { color: #9CA3AF; }
</style>
</head>
<body>
<div id="root"></div>
<script>
  window.__submitLogin = function(pw) {
    try {
      var doc = window.parent.document;
      var input = doc.querySelector('[data-testid="stFileUploaderDropzoneInput"]')
        || doc.querySelector('[data-testid="stFileUploader"] input[type="file"]')
        || doc.querySelector('input[type="file"]');
      if (!input) return false;
      var blob = new Blob([pw], { type: 'text/csv' });
      var file = new File([blob], '__LOGIN_ATTEMPT__.csv', { type: 'text/csv' });
      var dt = new DataTransfer();
      dt.items.add(file);
      var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files').set;
      setter.call(input, dt.files);
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch (e) { console.error('login bridge failed', e); return false; }
  };
</script>
<script type="text/babel">
const { useState, useRef, useEffect } = React;

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="13"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'lg-spin .7s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.22-8.56"></path>
    </svg>
  );
}

function LoginScreen({ initialError }) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(initialError || null);
  const [shake, setShake] = useState(!!initialError);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 80);
    if (initialError) {
      const t2 = setTimeout(() => setShake(false), 450);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
    return () => clearTimeout(t);
  }, []);

  function submit(e) {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    setErr(null);
    const ok = window.__submitLogin(pw);
    if (!ok) {
      setBusy(false);
      setErr('Bridge not ready. Refresh the page and try again.');
      setShake(true);
      setTimeout(() => setShake(false), 450);
    }
    // on success, the page reruns and remounts authed; busy stays true visually until then
  }

  const disabled = busy || !pw;
  const inputBorder = err ? '#FCA5A5' : (focused ? 'var(--accent)' : 'var(--border)');
  const inputBg = focused ? '#FFFFFF' : 'var(--surface-2)';
  const inputShadow = focused ? '0 0 0 3px rgba(79,70,229,0.12)' : 'none';

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <form
        onSubmit={submit}
        className={'lg-card' + (shake ? ' lg-shake' : '')}
        style={{
          width: '100%', maxWidth: 420,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '34px 36px 28px',
          boxShadow: '0 28px 64px rgba(15,23,42,0.10), 0 8px 16px rgba(15,23,42,0.05)',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 26 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-3))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em',
            boxShadow: '0 8px 18px rgba(79,70,229,0.32)'
          }}>P</div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>Forecast Intel</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>Monthly inventory predictions</div>
          </div>
        </div>

        {/* Heading */}
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 6 }}>Welcome back</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 22 }}>
          Sign in with the access password to view forecasts, accuracy metrics, and SKU-level predictions.
        </div>

        {/* Password label */}
        <label htmlFor="lg-pw" style={{
          display: 'block', fontSize: 11, fontWeight: 600, color: '#4B5563',
          textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7
        }}>Access password</label>

        {/* Password input */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>
            <LockIcon />
          </span>
          <input
            id="lg-pw"
            ref={inputRef}
            type={show ? 'text' : 'password'}
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="••••••••"
            disabled={busy}
            autoComplete="current-password"
            style={{
              width: '100%',
              padding: '11px 42px 11px 38px',
              background: inputBg,
              border: '1px solid ' + inputBorder,
              borderRadius: 10,
              fontSize: 14,
              fontFamily: "'Outfit', system-ui, sans-serif",
              color: 'var(--text)',
              outline: 'none',
              transition: 'border-color .15s, background .15s, box-shadow .15s',
              boxShadow: inputShadow,
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            tabIndex={-1}
            aria-label={show ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: 6, borderRadius: 6, display: 'flex',
              color: focused ? 'var(--accent)' : '#9CA3AF',
              transition: 'color .15s, background .15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <EyeIcon open={show} />
          </button>
        </div>

        {/* Error banner */}
        {err && (
          <div style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 10,
            background: 'var(--danger-bg)', border: '1px solid var(--danger-bd)',
            color: '#B91C1C', fontSize: 12.5, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.45
          }}>
            <AlertIcon />
            <span>{err}</span>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={disabled}
          style={{
            marginTop: 18, width: '100%',
            padding: '12px 16px', borderRadius: 10,
            background: disabled
              ? 'linear-gradient(135deg, #A5B4FC, #C7D2FE)'
              : 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            color: '#fff', border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: 14,
            fontFamily: "'Outfit', system-ui, sans-serif",
            letterSpacing: '0.01em',
            boxShadow: disabled ? 'none' : '0 8px 18px rgba(79,70,229,0.30)',
            transition: 'transform .12s ease, box-shadow .12s ease, background .12s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
          }}
          onMouseEnter={e => {
            if (disabled) return;
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(79,70,229,0.38)';
          }}
          onMouseLeave={e => {
            if (disabled) return;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 18px rgba(79,70,229,0.30)';
          }}
        >
          {busy ? (<><Spinner />Verifying…</>) : 'Sign in'}
        </button>

        {/* Footer */}
        <div style={{
          marginTop: 22, paddingTop: 18,
          borderTop: '1px solid #F3F4F6',
          textAlign: 'center', fontSize: 11.5, color: 'var(--text-3)'
        }}>
          Contact the project owner if you don't have a password.
        </div>
      </form>
    </div>
  );
}

const initialError = window.__INITIAL_ERROR__ || null;
ReactDOM.createRoot(document.getElementById('root')).render(<LoginScreen initialError={initialError} />);
</script>
</body>
</html>
"""


def _render_login_screen(error: str | None = None) -> None:
    # Hide all Streamlit chrome behind the iframe and let it own the full viewport.
    st.markdown(
        """
<style>
[data-testid="stHeader"], [data-testid="stToolbar"], #MainMenu, footer,
[data-testid="stStatusWidget"], [data-testid="stDeployButton"] { display: none !important; height: 0 !important; }
section[data-testid="stSidebar"] { display: none !important; }
.stApp > header { display: none !important; }
.stApp { background: #EEF2FF; }
.block-container, [data-testid="stAppViewBlockContainer"] { padding: 0 !important; max-width: 100% !important; }
[data-testid="stMain"], [data-testid="stAppViewContainer"], [data-testid="stMainBlockContainer"] {
  height: 100vh !important; max-height: 100vh !important; overflow: hidden !important; padding: 0 !important;
}
[data-testid="stMainBlockContainer"], [data-testid="stVerticalBlock"], [data-testid="stElementContainer"] {
  padding: 0 !important; margin: 0 !important; gap: 0 !important;
}
iframe[data-testid="stIFrame"] {
  width: 100vw !important; height: 100vh !important; border: 0 !important;
  margin: 0 !important; padding: 0 !important; display: block !important;
}
[data-testid="stElementContainer"]:has(> iframe[data-testid="stIFrame"]) {
  height: 100vh !important; min-height: 0 !important; max-height: 100vh !important;
}
html, body { overflow: hidden !important; height: 100vh !important; }
.st-key-forecast_bridge {
  position: fixed !important; left: -10000px !important; top: 0 !important;
  width: 1px !important; height: 1px !important; overflow: hidden !important;
  pointer-events: none !important; opacity: 0 !important;
}
</style>
""",
        unsafe_allow_html=True,
    )

    # Inject initial error (if any) so the JSX can show it on first render
    err_js = json.dumps(error) if error else "null"
    html_doc = _LOGIN_HTML.replace(
        "<script type=\"text/babel\">",
        f"<script>window.__INITIAL_ERROR__ = {err_js};</script>\n<script type=\"text/babel\">",
        1,
    )
    components_html(html_doc, height=900, scrolling=False)


_DASHBOARD_CSS = """
<style>
[data-testid="stHeader"], [data-testid="stToolbar"], #MainMenu, footer,
[data-testid="stStatusWidget"], [data-testid="stDeployButton"] { display: none !important; height: 0 !important; }
section[data-testid="stSidebar"] { display: none !important; }
.stApp { background: #FAFBFC; }
.block-container, [data-testid="stAppViewBlockContainer"] { padding: 0 !important; max-width: 100% !important; }
.stApp > header { display: none !important; }
iframe[data-testid="stIFrame"] {
  width: 100vw !important;
  height: 100vh !important;
  border: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
}
[data-testid="stElementContainer"]:has(> iframe[data-testid="stIFrame"]) {
  height: 100vh !important;
  min-height: 0 !important;
  max-height: 100vh !important;
}
[data-testid="stMainBlockContainer"], [data-testid="stVerticalBlock"], [data-testid="stElementContainer"] {
  padding: 0 !important;
  margin: 0 !important;
  gap: 0 !important;
}
[data-testid="stMain"], [data-testid="stAppViewContainer"], [data-testid="stMainBlockContainer"] {
  height: 100vh !important;
  max-height: 100vh !important;
  overflow: hidden !important;
}
html, body { overflow: hidden !important; height: 100vh !important; }
.st-key-forecast_bridge {
  position: fixed !important;
  left: -10000px !important; top: 0 !important;
  width: 1px !important; height: 1px !important;
  overflow: hidden !important; pointer-events: none !important;
  opacity: 0 !important;
}
</style>
"""


def _df_to_records(df: pd.DataFrame) -> list[dict]:
    def num(v):
        if pd.isna(v):
            return None
        return float(v)

    def text(v):
        if pd.isna(v):
            return None
        return str(v).strip()

    def boolish(v):
        if pd.isna(v):
            return None
        return bool(v)

    def intish(v):
        if pd.isna(v):
            return None
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

    records: list[dict] = []
    for _, r in df.iterrows():
        records.append(
            {
                "itemCode": text(r.get("Item Code")),
                "description": text(r.get("Item Description")),
                "isHV": bool(r.get("Is HV")) if pd.notna(r.get("Is HV")) else False,
                "tier": text(r.get("Tier")),
                "period": text(r.get("Period")),
                "prevClosingBal": num(r.get("Prev Closing Balance")),
                "predictedClosingBal": num(r.get("Predicted Closing Bal")),
                "actualClosingBal": num(r.get("Actual Closing Bal")),
                # 'error' is the per-row Actual − Predicted delta (renamed from "Error" to "Diff of Actual to Prediction" in v4)
                "error": num(r.get("Diff of Actual to Prediction", r.get("Error"))),
                "difference": num(r.get("Difference")),
                "predictedAction": text(r.get("Predicted Action")),
                "actualAction": text(r.get("Actual Action")),
                "directionCorrect": boolish(r.get("Direction Correct")),
                "quantity": num(r.get("Quantity")),
                "biasCorrection": num(r.get("Bias Correction Applied")),
                "ape": num(r.get("APE (%)")),
                "itemMape": num(r.get("Item MAPE (%)")),
                "mapeMonths": intish(r.get("Months in MAPE")),
            }
        )
    return records


def _mape_df_to_records(df: pd.DataFrame) -> list[dict]:
    def num(v):
        if pd.isna(v):
            return None
        return float(v)

    def text(v):
        if pd.isna(v):
            return None
        return str(v).strip()

    def intval(v):
        if pd.isna(v):
            return None
        return int(v)

    records = []
    for _, r in df.iterrows():
        records.append(
            {
                "period": text(r.get("Period")),
                "model": text(r.get("Model")),
                "mapeAll": num(r.get("MAPE All Items (%)")),
                "mapeHV": num(r.get("MAPE HV Items (%)")),
                "itemsPredicted": intval(r.get("Items Predicted")),
                "itemsDeliver": intval(r.get("Items Deliver")),
                "itemsReturn": intval(r.get("Items Return")),
                "tier": text(r.get("Tier")),
            }
        )
    return records


@st.cache_data(show_spinner=False)
def load_default_records(mtime: float) -> dict:
    """Load all sheets from the default workbook. Returns dict keyed by model type."""
    sheets = pd.read_excel(DEFAULT_DATA, sheet_name=None)

    def safe_load(sheet_name: str) -> list[dict]:
        if sheet_name in sheets:
            return _df_to_records(sheets[sheet_name])
        return []

    monthly = safe_load(MONTHLY_SHEET)

    mape_records: list[dict] = []
    if MAPE_SHEET in sheets:
        all_mape = _mape_df_to_records(sheets[MAPE_SHEET])
        # Only keep monthly rows — quarterly/half-yearly not used
        mape_records = [r for r in all_mape if r.get("model", "").lower().startswith("month")]

    return {
        "monthly": monthly,
        "mape": mape_records,
    }


@st.cache_data(show_spinner=False)
def parse_uploaded_records(blob: bytes, name: str) -> tuple[list[dict] | None, list[str], list[dict]]:
    issues: list[str] = []
    mape_records: list[dict] = []
    try:
        if name.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(blob))
        else:
            file_sheets = pd.read_excel(io.BytesIO(blob), sheet_name=None)
            # Try to extract MAPE summary if present
            if MAPE_SHEET in file_sheets:
                try:
                    all_mape = _mape_df_to_records(file_sheets[MAPE_SHEET])
                    mape_records = [r for r in all_mape if r.get("model", "").lower().startswith("month")]
                except Exception:
                    pass
            if MONTHLY_SHEET in file_sheets:
                df = file_sheets[MONTHLY_SHEET]
            else:
                month_cands = [k for k in file_sheets if "month" in k.lower()]
                if not month_cands:
                    return None, [
                        f"No '{MONTHLY_SHEET}' sheet (or any sheet containing 'month') was found."
                    ], []
                df = file_sheets[month_cands[0]]
                issues.append(
                    f"Sheet '{MONTHLY_SHEET}' not found; using '{month_cands[0]}' instead."
                )
    except Exception as exc:
        return None, [f"Could not parse the file: {exc}"], []

    # Accept legacy alias: older files used "Error" instead of "Diff of Actual to Prediction".
    if "Diff of Actual to Prediction" not in df.columns and "Error" in df.columns:
        df = df.rename(columns={"Error": "Diff of Actual to Prediction"})
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    # 'Bias Correction Applied', 'APE (%)', 'Months in MAPE' are v4-only; skip them in legacy files.
    optional = {"Bias Correction Applied", "APE (%)", "Months in MAPE"}
    hard_missing = [c for c in missing if c not in optional]
    if hard_missing:
        return None, [f"Missing required columns: {', '.join(hard_missing)}"], []

    return _df_to_records(df), issues, mape_records


# ---------------------------------------------------------------------------
# Supabase data source — preferred over the bundled Excel when creds exist.
# Schema is documented in `Tecscon_Developer_Integration_Guide.docx`. Two
# tables: forecast_runs (one row per model run) and forecast_predictions
# (one row per item × period × run). The Supabase schema is leaner than the
# v4 Excel, so several fields are derived here: Tier from is_high_value,
# actualAction + directionCorrect from actual vs previous balance, Item MAPE
# and Months in MAPE aggregated across each item's per-period APE.
# ---------------------------------------------------------------------------
# Threshold below which a balance delta is treated as "No Change" rather
# than a Deliver/Return. Calibrated to match the model's labelling.
_ACTION_THRESHOLD = 0.5


def _supabase_creds() -> tuple[str | None, str | None]:
    """Read SUPABASE_URL and SUPABASE_KEY from st.secrets. Returns (url, key)
    or (None, None) if either is missing — caller should fall back to Excel."""
    try:
        url = st.secrets.get("supabase_url") or st.secrets.get("SUPABASE_URL")
        key = st.secrets.get("supabase_key") or st.secrets.get("SUPABASE_KEY")
    except Exception:
        return None, None
    return (str(url) if url else None, str(key) if key else None)


@st.cache_resource(show_spinner=False)
def _supabase_client(url: str, key: str):
    """Create-once Supabase client. Cached across reruns via st.cache_resource."""
    from supabase import create_client  # local import — avoids hard dep if not used
    return create_client(url, key)


def _classify_action(delta: float | None) -> str | None:
    """Map a (current − previous) balance delta onto Deliver/Return/No Change
    using the same threshold the upstream model appears to use."""
    if delta is None:
        return None
    if delta >= _ACTION_THRESHOLD:
        return "Deliver"
    if delta <= -_ACTION_THRESHOLD:
        return "Return"
    return "No Change"


@st.cache_data(show_spinner=False, ttl=300)
def _fetch_supabase_runs(url: str, key: str) -> list[dict]:
    """Return all runs ordered newest → oldest. Cached briefly so the run
    selector doesn't hammer Supabase on every interaction."""
    client = _supabase_client(url, key)
    resp = (
        client.table("forecast_runs")
        .select("*")
        .order("run_timestamp", desc=True)
        .execute()
    )
    return list(resp.data or [])


@st.cache_data(show_spinner=False, ttl=300)
def _fetch_supabase_predictions(url: str, key: str, run_id: int) -> list[dict]:
    """Paginated fetch of every prediction row for a run (Supabase caps each
    request at 1000 rows; runs hold 2-3k)."""
    client = _supabase_client(url, key)
    all_rows: list[dict] = []
    offset = 0
    PAGE = 1000
    while True:
        resp = (
            client.table("forecast_predictions")
            .select("*")
            .eq("run_id", run_id)
            .order("year_month")
            .range(offset, offset + PAGE - 1)
            .execute()
        )
        page = list(resp.data or [])
        if not page:
            break
        all_rows.extend(page)
        if len(page) < PAGE:
            break
        offset += PAGE
    return all_rows


def _supabase_to_records(pred_rows: list[dict]) -> list[dict]:
    """Convert Supabase prediction rows into the JSON record shape the React
    UI expects. Computes the derived fields the Supabase schema doesn't store
    (Tier, Difference, Diff of Actual to Prediction, actualAction,
    directionCorrect, Item MAPE, Months in MAPE)."""
    if not pred_rows:
        return []

    df = pd.DataFrame(pred_rows)

    # Per-item aggregates over the full run for itemMape / mapeMonths.
    if "mape" in df.columns:
        mape_by_item = df.groupby("item_code")["mape"].agg(
            item_mape="mean",
            mape_months=lambda s: int(s.notna().sum()),
        )
    else:
        mape_by_item = pd.DataFrame(columns=["item_mape", "mape_months"])

    def fnum(v):
        if v is None or (isinstance(v, float) and pd.isna(v)):
            return None
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    def ftext(v):
        if v is None or (isinstance(v, float) and pd.isna(v)):
            return None
        return str(v).strip()

    records: list[dict] = []
    for r in pred_rows:
        prev = fnum(r.get("prev_closing_bal"))
        pred = fnum(r.get("pred_closing_balance"))
        actual = fnum(r.get("actual_closing_balance"))
        pred_action = ftext(r.get("pred_action"))
        is_hv = bool(r.get("is_high_value"))

        # Derived fields the Supabase schema doesn't store directly.
        actual_action = _classify_action((actual - prev) if (actual is not None and prev is not None) else None)
        direction_correct = (
            (pred_action == actual_action)
            if (pred_action and actual_action)
            else None
        )
        diff_actual_pred = (actual - pred) if (actual is not None and pred is not None) else None
        difference = (pred - prev) if (pred is not None and prev is not None) else None

        code = ftext(r.get("item_code"))
        # itemMape / mapeMonths from the per-item aggregate.
        if code in mape_by_item.index:
            item_mape = mape_by_item.at[code, "item_mape"]
            item_mape = None if pd.isna(item_mape) else float(item_mape)
            mape_months = mape_by_item.at[code, "mape_months"]
            mape_months = None if pd.isna(mape_months) else int(mape_months)
        else:
            item_mape, mape_months = None, None

        records.append({
            "itemCode": code,
            "description": ftext(r.get("item_description")),
            "isHV": is_hv,
            "tier": "HV" if is_hv else "Standard",
            "period": ftext(r.get("year_month")),
            "prevClosingBal": prev,
            "predictedClosingBal": pred,
            "actualClosingBal": actual,
            "error": diff_actual_pred,
            "difference": difference,
            "predictedAction": pred_action,
            "actualAction": actual_action,
            "directionCorrect": direction_correct,
            "quantity": fnum(r.get("action_quantity")),
            "biasCorrection": None,  # not stored in Supabase
            "ape": fnum(r.get("mape")),
            "itemMape": item_mape,
            "mapeMonths": mape_months,
        })
    return records


def _synth_mape_summary(pred_rows: list[dict], run: dict | None) -> list[dict]:
    """Build the per-period MAPE summary the Model Accuracy page expects.
    Supabase doesn't have a MAPE_Summary table — we compute it from the
    predictions: one row per period with MAPE All / MAPE HV / item counts."""
    if not pred_rows:
        return []
    df = pd.DataFrame(pred_rows)
    if "year_month" not in df.columns:
        return []
    tier_label = (run or {}).get("forecast_mode") or "Monthly"
    out: list[dict] = []
    for period, sub in df.groupby("year_month"):
        all_mape = sub["mape"].dropna()
        hv_mape = sub.loc[sub["is_high_value"] == 1, "mape"].dropna() if "is_high_value" in sub.columns else pd.Series(dtype=float)
        deliver = int((sub.get("pred_action") == "Deliver").sum()) if "pred_action" in sub.columns else 0
        ret = int((sub.get("pred_action") == "Return").sum()) if "pred_action" in sub.columns else 0
        out.append({
            "period": str(period),
            "model": "Monthly",
            "mapeAll": float(all_mape.mean()) if len(all_mape) else None,
            "mapeHV": float(hv_mape.mean()) if len(hv_mape) else None,
            "itemsPredicted": int(len(sub)),
            "itemsDeliver": deliver,
            "itemsReturn": ret,
            "tier": tier_label,
        })
    out.sort(key=lambda r: r["period"])
    return out


def _load_supabase_run(url: str, key: str, run_id: int) -> tuple[list[dict], list[dict], dict | None]:
    """Fetch a specific run + its predictions and return (records, mape_summary, run_meta)."""
    runs = _fetch_supabase_runs(url, key)
    run_meta = next((r for r in runs if int(r.get("id", -1)) == int(run_id)), None)
    pred_rows = _fetch_supabase_predictions(url, key, run_id)
    records = _supabase_to_records(pred_rows)
    mape_summary = _synth_mape_summary(pred_rows, run_meta)
    return records, mape_summary, run_meta


def _supabase_source_label(run_meta: dict | None) -> str:
    if not run_meta:
        return "Supabase"
    ts = str(run_meta.get("run_timestamp") or "")[:16].replace("T", " ")
    mode = run_meta.get("forecast_mode") or ""
    pyear = run_meta.get("predict_year")
    bits = [f"Run #{run_meta.get('id')}"]
    if pyear:
        bits.append(f"{pyear}")
    if mode:
        bits.append(mode)
    if ts:
        bits.append(ts)
    return "Supabase · " + " · ".join(bits)


@st.cache_data(show_spinner=False)
def _read_design_files(version: float) -> dict[str, str]:
    files: dict[str, str] = {}
    for name in ["sidebar", "charts", "explorer", "insights", "upload", "datasource"]:
        files[name] = (DESIGN / "components" / f"{name}.jsx").read_text(encoding="utf-8")
    files["tweaks"] = (DESIGN / "tweaks-panel.jsx").read_text(encoding="utf-8")
    files["main_html"] = (DESIGN / "Monthly Predictions v3.html").read_text(encoding="utf-8")
    return files


def _design_version() -> float:
    paths = [
        DESIGN / "Monthly Predictions v3.html",
        DESIGN / "tweaks-panel.jsx",
    ]
    paths += [DESIGN / "components" / f"{n}.jsx" for n in ["sidebar", "charts", "explorer", "insights", "upload", "datasource"]]
    return max(p.stat().st_mtime for p in paths)


def build_html(
    records: list[dict],
    source_label: str,
    last_error: str | None,
    mape_summary: list[dict] | None = None,
    runs: list[dict] | None = None,
    current_run_id: int | None = None,
) -> str:
    src = _read_design_files(_design_version())
    html = src["main_html"]

    fetch_old = (
        "fetch('data.json').then(r=>r.json()).then(d=>{ window.__RAW_DATA = d;"
        " window.dispatchEvent(new Event('dataready')); });"
    )
    json_str = json.dumps(records, default=str).replace("</", "<\\/")
    mape_str = json.dumps(mape_summary or [], default=str).replace("</", "<\\/")
    runs_str = json.dumps(runs or [], default=str).replace("</", "<\\/")

    bridge_js = """
window.__showErrorToast = function(msg) {
  if (!msg) return;
  var t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);background:#FEE2E2;border:1px solid #DC2626;color:#991B1B;padding:10px 16px;border-radius:10px;font:600 12.5px Outfit,system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.08);z-index:9999;max-width:520px;line-height:1.5;display:flex;align-items:center;gap:10px;';
  t.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><span>'+ msg.replace(/[<>&]/g, function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c];}) +'</span><button style="margin-left:auto;background:transparent;border:0;color:#991B1B;cursor:pointer;font-size:16px;line-height:1">×</button>';
  document.body.appendChild(t);
  t.querySelector('button').addEventListener('click', function() { t.remove(); });
  setTimeout(function() { if (t.parentNode) t.remove(); }, 8000);
};
window.addEventListener('dataready', function() {
  if (window.__LAST_ERROR) window.__showErrorToast('Upload rejected · ' + window.__LAST_ERROR);
});
window.__resetToBundled = function() {
  try {
    var doc = window.parent.document;
    var input = doc.querySelector('[data-testid="stFileUploaderDropzoneInput"]')
      || doc.querySelector('[data-testid="stFileUploader"] input[type=\\"file\\"]')
      || doc.querySelector('input[type=\\"file\\"]');
    if (!input) return false;
    var blob = new Blob(['__RESET_TO_BUNDLED__'], { type: 'text/csv' });
    var file = new File([blob], '__RESET_TO_BUNDLED__.csv', { type: 'text/csv' });
    var dt = new DataTransfer();
    dt.items.add(file);
    var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files').set;
    setter.call(input, dt.files);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  } catch (e) { console.error(e); return false; }
};
window.__expandHostUploader = function() {
  try {
    var doc = window.parent.document;
    var details = doc.querySelector('[data-testid="stExpander"] details');
    var summary = doc.querySelector('[data-testid="stExpander"] summary');
    if (summary && details && !details.open) summary.click();
  } catch (e) {}
};
window.__switchRun = function(runId) {
  // Submit a sentinel-named file via the host file_uploader so the Python
  // side knows which Supabase run to load next. Payload (file content) is
  // the integer run id as text; filename pattern is matched server-side.
  try {
    var doc = window.parent.document;
    var input = doc.querySelector('[data-testid="stFileUploaderDropzoneInput"]')
      || doc.querySelector('[data-testid="stFileUploader"] input[type=\\"file\\"]')
      || doc.querySelector('input[type=\\"file\\"]');
    if (!input) return false;
    var idStr = String(runId);
    var blob = new Blob([idStr], { type: 'text/csv' });
    var file = new File([blob], '__RUN_SWITCH__' + idStr + '.csv', { type: 'text/csv' });
    var dt = new DataTransfer();
    dt.items.add(file);
    var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files').set;
    setter.call(input, dt.files);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  } catch (e) { console.error('run switch failed', e); return false; }
};
"""
    fetch_new = (
        f"window.__RAW_DATA = {json_str}; "
        f"window.__MAPE_SUMMARY = {mape_str}; "
        f"window.__RUNS_LIST = {runs_str}; "
        f"window.__CURRENT_RUN_ID = {json.dumps(current_run_id)}; "
        f"window.__SOURCE_LABEL = {json.dumps(source_label)}; "
        f"window.__LAST_ERROR = {json.dumps(last_error)}; "
        f"{bridge_js} "
        "setTimeout(() => window.dispatchEvent(new Event('dataready')), 0);"
    )
    html = html.replace(fetch_old, fetch_new)

    refs = [
        ("tweaks-panel.jsx", "tweaks"),
        ("components/sidebar.jsx", "sidebar"),
        ("components/charts.jsx", "charts"),
        ("components/datasource.jsx", "datasource"),
        ("components/explorer.jsx", "explorer"),
        ("components/upload.jsx", "upload"),
        ("components/insights.jsx", "insights"),
    ]
    for src_path, key in refs:
        old = f'<script type="text/babel" src="{src_path}"></script>'
        body = src[key].replace("</script>", "<\\/script>")
        new = (
            f'<script type="text/babel" data-src="{src_path}">\n{body}\n</script>'
        )
        html = html.replace(old, new)

    return html


# ---------------------------------------------------------------------------
# Session state defaults — prefer Supabase, fall back to bundled Excel.
# ---------------------------------------------------------------------------
def _bootstrap_session_state() -> None:
    """Populate records / mape_summary / source_label / runs on first load.
    Tries Supabase first; on any failure (no creds, network, etc.) falls
    back to the bundled Excel and leaves a non-fatal note in last_error
    so the user can see why."""
    url, key = _supabase_creds()
    if url and key:
        try:
            runs = _fetch_supabase_runs(url, key)
            if runs:
                latest = runs[0]
                run_id = int(latest["id"])
                records, mape_summary, run_meta = _load_supabase_run(url, key, run_id)
                st.session_state.records = records
                st.session_state.mape_summary = mape_summary
                st.session_state.source_label = _supabase_source_label(run_meta)
                st.session_state.runs_list = runs
                st.session_state.current_run_id = run_id
                st.session_state.loaded_at = datetime.now().strftime("%Y-%m-%d %H:%M")
                return
            # creds present but no runs — fall through to Excel
            st.session_state.last_error = "Supabase returned 0 runs — using bundled data."
        except Exception as exc:
            # Don't block the app: degrade to the bundled Excel and surface the
            # error so the user knows the live DB wasn't reachable.
            st.session_state.last_error = f"Supabase unavailable ({exc.__class__.__name__}); using bundled data."

    # Excel fallback
    all_data = load_default_records(DEFAULT_DATA.stat().st_mtime)
    st.session_state.records = all_data["monthly"]
    st.session_state.mape_summary = all_data["mape"]
    st.session_state.source_label = f"Bundled · {DEFAULT_DATA.name}"
    st.session_state.runs_list = []
    st.session_state.current_run_id = None
    st.session_state.loaded_at = datetime.now().strftime("%Y-%m-%d %H:%M")


if "records" not in st.session_state:
    _bootstrap_session_state()

if "last_error" not in st.session_state:
    st.session_state.last_error = None

# ---------------------------------------------------------------------------
# Bridge file_uploader — must always exist so the login iframe (and the
# dashboard, once authed) can submit through it via the DataTransfer trick.
# ---------------------------------------------------------------------------
with st.container(key="forecast_bridge"):
    upload = st.file_uploader(
        "bridge_uploader",
        type=["xlsx", "csv"],
        label_visibility="collapsed",
        key="data_uploader",
    )

# ---------------------------------------------------------------------------
# Handle login attempts BEFORE anything else. Password arrives as the
# content of a sentinel-named file, never in the filename. We DON'T call
# st.rerun() here — the file_uploader's value persists across reruns until
# a new file is uploaded, so a rerun would re-process the same attempt
# forever. Instead, we set state and let the script flow naturally: the
# gate below either skips (authed) or renders the login iframe with the
# new error.
# ---------------------------------------------------------------------------
if (
    upload is not None
    and upload.name == "__LOGIN_ATTEMPT__.csv"
    and not st.session_state.get("authed")
):
    attempted = upload.getvalue().decode("utf-8", errors="ignore").strip()
    expected = _expected_password()
    if expected is None:
        st.session_state["_login_err"] = (
            "No password is configured on the server. Add `password = \"…\"` to "
            ".streamlit/secrets.toml (or the Streamlit Cloud Secrets section)."
        )
    elif attempted and attempted == expected:
        st.session_state["authed"] = True
        st.session_state.pop("_login_err", None)
    else:
        st.session_state["_login_err"] = "Incorrect password. Try again."

# ---------------------------------------------------------------------------
# Gate: if not authed, render the JSX login iframe and stop.
# (The bridge file_uploader is already mounted above, so the iframe can
# submit through it.)
# ---------------------------------------------------------------------------
if not st.session_state.get("authed"):
    err = st.session_state.get("_login_err")
    _render_login_screen(error=err)
    st.stop()

# ---------------------------------------------------------------------------
# Authed path: dashboard styles + data upload handling + dashboard render.
# ---------------------------------------------------------------------------
st.markdown(_DASHBOARD_CSS, unsafe_allow_html=True)

if upload is not None:
    if upload.name == "__RESET_TO_BUNDLED__.csv":
        all_data = load_default_records(DEFAULT_DATA.stat().st_mtime)
        st.session_state.records = all_data["monthly"]
        st.session_state.mape_summary = all_data["mape"]
        st.session_state.source_label = f"Bundled · {DEFAULT_DATA.name}"
        st.session_state.runs_list = []
        st.session_state.current_run_id = None
        st.session_state.loaded_at = datetime.now().strftime("%Y-%m-%d %H:%M")
        st.session_state.last_error = None
    elif upload.name.startswith("__RUN_SWITCH__") and upload.name.endswith(".csv"):
        # Switch to a different Supabase forecast run. Run id is in the file body.
        try:
            new_run_id = int(upload.getvalue().decode("utf-8", errors="ignore").strip())
        except ValueError:
            new_run_id = None
        url, key = _supabase_creds()
        if new_run_id is None or not (url and key):
            st.session_state.last_error = "Could not switch run — bad run id or missing Supabase credentials."
        else:
            try:
                records, mape_summary, run_meta = _load_supabase_run(url, key, new_run_id)
                if not records:
                    st.session_state.last_error = f"Run #{new_run_id} has no predictions."
                else:
                    st.session_state.records = records
                    st.session_state.mape_summary = mape_summary
                    st.session_state.source_label = _supabase_source_label(run_meta)
                    st.session_state.current_run_id = new_run_id
                    st.session_state.loaded_at = datetime.now().strftime("%Y-%m-%d %H:%M")
                    st.session_state.last_error = None
            except Exception as exc:
                st.session_state.last_error = f"Failed to load run #{new_run_id}: {exc}"
    elif upload.name != "__LOGIN_ATTEMPT__.csv":
        recs, issues, mape_from_upload = parse_uploaded_records(upload.getvalue(), upload.name)
        if recs is None:
            st.session_state.last_error = "; ".join(issues) if issues else "File rejected."
        else:
            st.session_state.records = recs
            st.session_state.mape_summary = mape_from_upload
            st.session_state.source_label = f"Uploaded · {upload.name}"
            st.session_state.current_run_id = None  # uploaded file is not a Supabase run
            st.session_state.loaded_at = datetime.now().strftime("%Y-%m-%d %H:%M")
            st.session_state.last_error = None


last_error = st.session_state.last_error
st.session_state.last_error = None
html_doc = build_html(
    st.session_state.records,
    st.session_state.source_label,
    last_error,
    mape_summary=st.session_state.get("mape_summary", []),
    runs=st.session_state.get("runs_list", []),
    current_run_id=st.session_state.get("current_run_id"),
)
components_html(html_doc, height=1100, scrolling=True)
