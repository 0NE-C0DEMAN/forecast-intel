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
DEFAULT_DATA = ROOT / "Forecast_26_Jan_Feb_Results_train24_25_fixed.xlsx"
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
    "Error",
    "Difference",
    "Predicted Action",
    "Actual Action",
    "Direction Correct",
    "Quantity",
    "Item MAPE (%)",
]

st.set_page_config(
    page_title="Forecast Intel",
    page_icon=":bar_chart:",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
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
""",
    unsafe_allow_html=True,
)


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
                "error": num(r.get("Error")),
                "difference": num(r.get("Difference")),
                "predictedAction": text(r.get("Predicted Action")),
                "actualAction": text(r.get("Actual Action")),
                "directionCorrect": boolish(r.get("Direction Correct")),
                "quantity": num(r.get("Quantity")),
                "itemMape": num(r.get("Item MAPE (%)")),
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

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        return None, [f"Missing required columns: {', '.join(missing)}"], []

    return _df_to_records(df), issues, mape_records


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
) -> str:
    src = _read_design_files(_design_version())
    html = src["main_html"]

    fetch_old = (
        "fetch('data.json').then(r=>r.json()).then(d=>{ window.__RAW_DATA = d;"
        " window.dispatchEvent(new Event('dataready')); });"
    )
    json_str = json.dumps(records, default=str).replace("</", "<\\/")
    mape_str = json.dumps(mape_summary or [], default=str).replace("</", "<\\/")

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
"""
    fetch_new = (
        f"window.__RAW_DATA = {json_str}; "
        f"window.__MAPE_SUMMARY = {mape_str}; "
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


if "records" not in st.session_state:
    all_data = load_default_records(DEFAULT_DATA.stat().st_mtime)
    st.session_state.records = all_data["monthly"]
    st.session_state.mape_summary = all_data["mape"]
    st.session_state.source_label = f"Bundled · {DEFAULT_DATA.name}"
    st.session_state.loaded_at = datetime.now().strftime("%Y-%m-%d %H:%M")

if "last_error" not in st.session_state:
    st.session_state.last_error = None

with st.container(key="forecast_bridge"):
    upload = st.file_uploader(
        "bridge_uploader",
        type=["xlsx", "csv"],
        label_visibility="collapsed",
        key="data_uploader",
    )

if upload is not None:
    if upload.name == "__RESET_TO_BUNDLED__.csv":
        all_data = load_default_records(DEFAULT_DATA.stat().st_mtime)
        st.session_state.records = all_data["monthly"]
        st.session_state.mape_summary = all_data["mape"]
        st.session_state.source_label = f"Bundled · {DEFAULT_DATA.name}"
        st.session_state.loaded_at = datetime.now().strftime("%Y-%m-%d %H:%M")
        st.session_state.last_error = None
    else:
        recs, issues, mape_from_upload = parse_uploaded_records(upload.getvalue(), upload.name)
        if recs is None:
            st.session_state.last_error = "; ".join(issues) if issues else "File rejected."
        else:
            st.session_state.records = recs
            st.session_state.mape_summary = mape_from_upload
            st.session_state.source_label = f"Uploaded · {upload.name}"
            st.session_state.loaded_at = datetime.now().strftime("%Y-%m-%d %H:%M")
            st.session_state.last_error = None


last_error = st.session_state.last_error
st.session_state.last_error = None
html_doc = build_html(
    st.session_state.records,
    st.session_state.source_label,
    last_error,
    mape_summary=st.session_state.get("mape_summary", []),
)
components_html(html_doc, height=1100, scrolling=True)
