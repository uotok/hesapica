#!/usr/bin/env python3
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_FILE = ROOT / "rates.json"

POPULAR_ORDER = [
    "TRY", "USD", "EUR", "GBP", "CHF", "JPY", "SAR", "AED", "CAD", "AUD",
    "CNY", "RUB", "KWD", "NOK", "SEK", "DKK", "QAR", "AZN", "XAU", "XAG"
]

META = {
    "TRY": {"name_tr": "Türk Lirası", "name_en": "Turkish Lira", "type": "currency"},
    "USD": {"name_tr": "ABD Doları", "name_en": "US Dollar", "type": "currency"},
    "EUR": {"name_tr": "Euro", "name_en": "Euro", "type": "currency"},
    "GBP": {"name_tr": "İngiliz Sterlini", "name_en": "British Pound", "type": "currency"},
    "CHF": {"name_tr": "İsviçre Frangı", "name_en": "Swiss Franc", "type": "currency"},
    "JPY": {"name_tr": "Japon Yeni", "name_en": "Japanese Yen", "type": "currency"},
    "SAR": {"name_tr": "Suudi Riyali", "name_en": "Saudi Riyal", "type": "currency"},
    "AED": {"name_tr": "BAE Dirhemi", "name_en": "UAE Dirham", "type": "currency"},
    "CAD": {"name_tr": "Kanada Doları", "name_en": "Canadian Dollar", "type": "currency"},
    "AUD": {"name_tr": "Avustralya Doları", "name_en": "Australian Dollar", "type": "currency"},
    "CNY": {"name_tr": "Çin Yuanı", "name_en": "Chinese Yuan", "type": "currency"},
    "RUB": {"name_tr": "Rus Rublesi", "name_en": "Russian Ruble", "type": "currency"},
    "KWD": {"name_tr": "Kuveyt Dinarı", "name_en": "Kuwaiti Dinar", "type": "currency"},
    "NOK": {"name_tr": "Norveç Kronu", "name_en": "Norwegian Krone", "type": "currency"},
    "SEK": {"name_tr": "İsveç Kronu", "name_en": "Swedish Krona", "type": "currency"},
    "DKK": {"name_tr": "Danimarka Kronu", "name_en": "Danish Krone", "type": "currency"},
    "QAR": {"name_tr": "Katar Riyali", "name_en": "Qatari Riyal", "type": "currency"},
    "AZN": {"name_tr": "Azerbaycan Manatı", "name_en": "Azerbaijani Manat", "type": "currency"},
    "XAU": {"name_tr": "Gram Altın", "name_en": "Gold (Gram)", "type": "metal"},
    "XAG": {"name_tr": "Gümüş", "name_en": "Silver", "type": "metal"},
}


def fetch_text(url: str, timeout: int = 20) -> str:
    last_err = None
    for _ in range(3):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; hesapica-rates-bot/1.0)",
                "Accept": "application/json,text/plain,*/*,application/xml,text/xml",
                "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.7,en;q=0.6",
                "Cache-Control": "no-cache"
            })
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read().decode("utf-8", errors="ignore")
        except Exception as err:
            last_err = err
    raise RuntimeError(f"Request failed for {url}: {last_err}")


def parse_float(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)

    s = str(value).strip()
    s = re.sub(r"[^0-9,\.\-]", "", s)
    if not s:
        return None

    # Locale-safe parsing:
    # - "47,3927" -> 47.3927
    # - "1.234,56" -> 1234.56
    # - "47.3927" -> 47.3927
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")

    try:
        return float(s)
    except ValueError:
        return None


def fetch_tcmb_rates():
    xml_text = fetch_text("https://www.tcmb.gov.tr/kurlar/today.xml")
    root = ET.fromstring(xml_text)
    date_attr = root.attrib.get("Tarih") or root.attrib.get("Date")
    rates = {"TRY": 1.0}

    for cur in root.findall("Currency"):
        code = (cur.attrib.get("CurrencyCode") or "").upper().strip()
        if not code:
            continue
        selling = parse_float(cur.findtext("ForexSelling"))
        if selling and selling > 0:
            rates[code] = selling

    return {
        "source": "TCMB",
        "update": date_attr,
        "rates": rates,
    }


def fetch_truncgil_rates():
    txt = fetch_text("https://finans.truncgil.com/v4/today.json")
    data = json.loads(txt)
    rates = {}

    for key, value in data.items():
        if not isinstance(value, dict):
            continue
        selling = parse_float(value.get("Selling"))
        if not selling or selling <= 0:
            continue

        code = key.upper().strip()
        if value.get("Type") == "Currency" and len(code) == 3 and code.isalpha():
            rates[code] = selling

    # metals
    gold = data.get("GRA") or {}
    silver = data.get("GUMUS") or {}
    gold_val = parse_float(gold.get("Selling"))
    silver_val = parse_float(silver.get("Selling"))
    if gold_val and gold_val > 0:
        rates["XAU"] = gold_val
    if silver_val and silver_val > 0:
        rates["XAG"] = silver_val

    rates["TRY"] = 1.0

    return {
        "source": "TRUNCGIL",
        "update": data.get("Update_Date"),
        "rates": rates,
    }


def build_payload():
    tcmb = None
    truncgil = None
    errors = []

    try:
        tcmb = fetch_tcmb_rates()
    except Exception as e:
        errors.append(f"TCMB fetch failed: {e}")

    try:
        truncgil = fetch_truncgil_rates()
    except Exception as e:
        errors.append(f"TRUNCGIL fetch failed: {e}")

    if not tcmb and not truncgil:
        raise RuntimeError("No data source available. " + " | ".join(errors))

    merged = {"TRY": 1.0}
    sources = []

    if tcmb:
        merged.update(tcmb["rates"])
        sources.append("TCMB")

    if truncgil:
        # fill gaps + metals
        for k, v in truncgil["rates"].items():
            if k not in merged or k in ("XAU", "XAG"):
                merged[k] = v
        sources.append("Truncgil")
    elif OUT_FILE.exists():
        # Keep last-known metals if provider is temporarily unavailable
        try:
            prev = json.loads(OUT_FILE.read_text(encoding="utf-8"))
            prev_rates = prev.get("rates_try", {})
            for metal_code in ("XAU", "XAG"):
                v = parse_float(prev_rates.get(metal_code))
                if v and v > 0:
                    merged[metal_code] = v
        except Exception:
            pass

    available_order = [code for code in POPULAR_ORDER if code in merged]
    rates_out = {code: round(float(merged[code]), 6) for code in available_order}

    now_utc = datetime.now(timezone.utc)
    payload = {
        "schema_version": 1,
        "updated_at_utc": now_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_priority": sources,
        "source_updates": {
            "tcmb": tcmb["update"] if tcmb else None,
            "truncgil": truncgil["update"] if truncgil else None,
        },
        "notes": {
            "tr": "Veriler günlük olarak otomatik güncellenir. Kurlar bilgilendirme amaçlıdır; alım-satımda kurum makasları farklı olabilir.",
            "en": "Rates are updated automatically on a daily basis. Values are for informational use; institution spreads may differ."
        },
        "rates_try": rates_out,
        "currency_meta": {code: META.get(code, {"name_tr": code, "name_en": code, "type": "currency"}) for code in rates_out.keys()},
    }

    return payload


def main():
    payload = build_payload()
    OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_FILE} with {len(payload['rates_try'])} rates")


if __name__ == "__main__":
    main()
