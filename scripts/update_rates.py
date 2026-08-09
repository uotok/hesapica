#!/usr/bin/env python3
import json
import math
import os
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
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
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; hesapica-rates-bot/3.0)",
                "Accept": "application/json,text/plain,*/*,application/xml,text/xml",
                "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.7,en;q=0.6",
                "Cache-Control": "no-cache",
            })
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read(2_000_000)
                if not raw:
                    raise RuntimeError("Empty response")
                return raw.decode("utf-8", errors="strict")
        except Exception as err:
            last_err = err
            if attempt < 2:
                time.sleep(0.6 * (attempt + 1))
    raise RuntimeError(f"Request failed for {url}: {last_err}")


def parse_float(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        number = float(value)
        return number if math.isfinite(number) else None

    s = str(value).strip()
    if not s:
        return None

    # Kaynaklar sayı dışında sembol/metin ekleyebildiği için yalnız izin verilen
    # karakterleri bırak; sonuç yine de sonlu ve pozitiflik kontrollerinden geçer.
    s = re.sub(r"[^0-9,.\-+]", "", s)
    if not s or s in {"-", "+"}:
        return None

    # TCMB noktayı, Truncgil çoğunlukla virgülü ondalık ayırıcı olarak kullanır.
    # İki ayırıcı birlikteyse son görülen ayırıcıyı ondalık kabul et.
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s:
        s = s.replace(",", ".")

    try:
        number = float(s)
        return number if math.isfinite(number) else None
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
        unit = parse_float(cur.findtext("Unit")) or 1.0

        # TCMB bazı para birimlerini birden fazla birim üzerinden yayımlar.
        # Örn. JPY için ForexSelling 100 JPY'nin TL karşılığıdır; rates_try ise
        # daima 1 birimin TL karşılığını tutar.
        if selling is not None and selling > 0 and unit > 0:
            per_unit = selling / unit
            if math.isfinite(per_unit) and per_unit > 0:
                rates[code] = per_unit

    if len(rates) < 4 or "USD" not in rates or "EUR" not in rates:
        raise RuntimeError("TCMB response did not contain enough valid rates")

    return {
        "source": "TCMB",
        "update": date_attr,
        "rates": rates,
    }


def fetch_truncgil_rates():
    txt = fetch_text("https://finans.truncgil.com/v4/today.json")
    data = json.loads(txt)
    if not isinstance(data, dict):
        raise RuntimeError("Truncgil response is not an object")

    rates = {}

    for key, value in data.items():
        if not isinstance(value, dict):
            continue
        selling = parse_float(value.get("Selling"))
        if selling is None or selling <= 0:
            continue

        code = str(key).upper().strip()
        value_type = str(value.get("Type") or "").strip().lower()
        if value_type == "currency" and len(code) == 3 and code.isalpha():
            rates[code] = selling

    # Truncgil'de GRA gram altını, GUMUS ise gümüşün gram TL değerini temsil eder.
    gold = data.get("GRA") or {}
    silver = data.get("GUMUS") or {}
    gold_val = parse_float(gold.get("Selling")) if isinstance(gold, dict) else None
    silver_val = parse_float(silver.get("Selling")) if isinstance(silver, dict) else None
    if gold_val is not None and gold_val > 0:
        rates["XAU"] = gold_val
    if silver_val is not None and silver_val > 0:
        rates["XAG"] = silver_val

    rates["TRY"] = 1.0
    warnings = []

    # Truncgil zaman zaman JPY değerini 100x ölçek hatasıyla döndürebiliyor.
    # USD/JPY çapraz oranı üzerinden geniş bir sağlama yap; şüpheli JPY'yi
    # yayımlamak yerine atla. TCMB mevcutsa JPY zaten ana kaynaktan gelir.
    usd = rates.get("USD")
    jpy = rates.get("JPY")
    if usd and jpy:
        jpy_to_usd_ratio = jpy / usd
        if not (0.001 <= jpy_to_usd_ratio <= 0.1):
            rates.pop("JPY", None)
            warnings.append("Truncgil JPY ignored because its unit ratio was implausible")

    if len(rates) < 4:
        raise RuntimeError("Truncgil response did not contain enough valid rates")

    return {
        "source": "TRUNCGIL",
        "update": data.get("Update_Date") or data.get("update_date"),
        "rates": rates,
        "warnings": warnings,
    }


def build_payload(require_tcmb=False):
    tcmb = None
    truncgil = None
    errors = []

    try:
        tcmb = fetch_tcmb_rates()
    except Exception as exc:
        errors.append(f"TCMB fetch failed: {exc}")

    try:
        truncgil = fetch_truncgil_rates()
    except Exception as exc:
        errors.append(f"TRUNCGIL fetch failed: {exc}")

    if not tcmb and not truncgil:
        raise RuntimeError("No data source available. " + " | ".join(errors))

    if require_tcmb and not tcmb:
        raise RuntimeError("TCMB is required for this run; rates.json was not changed. " + " | ".join(errors))

    warnings = []
    if truncgil:
        warnings.extend(truncgil.get("warnings") or [])

    merged = {"TRY": 1.0}
    rate_sources = {"TRY": "system"}
    sources = []

    if tcmb:
        for code, value in tcmb["rates"].items():
            merged[code] = value
            rate_sources[code] = "TCMB" if code != "TRY" else "system"
        sources.append("TCMB")

    if truncgil:
        contributed = False
        # TCMB önceliklidir. Truncgil yalnız eksikleri ve metalleri tamamlar.
        for code, value in truncgil["rates"].items():
            if code == "TRY":
                continue
            if code not in merged or code in ("XAU", "XAG"):
                merged[code] = value
                rate_sources[code] = "Truncgil"
                contributed = True
        if contributed or not tcmb:
            sources.append("Truncgil")

    # Bir sağlayıcı erişilemiyorsa önceki rates.json'dan sessizce eski veri taşımıyoruz.
    # Böylece özellikle XAU/XAG eski olduğu halde yeni timestamp ile yayımlanmaz.
    available_order = [code for code in POPULAR_ORDER if code in merged]
    rates_out = {}
    source_out = {}
    for code in available_order:
        value = float(merged[code])
        if not math.isfinite(value) or value <= 0:
            continue
        rates_out[code] = round(value, 6)
        source_out[code] = rate_sources.get(code, "unknown")

    if rates_out.get("TRY") != 1.0 or len(rates_out) < 4:
        raise RuntimeError("Merged payload did not contain enough valid rates")

    now_utc = datetime.now(timezone.utc)
    generated_at = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    payload = {
        "schema_version": 2,
        # Backward compatibility: existing clients may look for either name.
        "updated_at": generated_at,
        "updated_at_utc": generated_at,
        "generated_at_utc": generated_at,
        "source_priority": sources,
        "source_updates": {
            "tcmb": tcmb["update"] if tcmb else None,
            "truncgil": truncgil["update"] if truncgil else None,
        },
        "notes": {
            "tr": (
                "Bu dosya update_rates.py çalıştırıldığında kaynaklardan yeniden üretilir. "
                "Otomatik çalışma sıklığı sunucu/GitHub Actions zamanlayıcısına bağlıdır. "
                "Kurlar bilgilendirme amaçlıdır; kurumların işlem kurları ve makasları farklı olabilir."
            ),
            "en": (
                "This file is rebuilt from its sources whenever update_rates.py runs. "
                "Automatic refresh frequency depends on the server/GitHub Actions scheduler. "
                "Rates are informational; institution transaction rates and spreads may differ."
            ),
        },
        "rates_try": rates_out,
        "rate_sources": source_out,
        "currency_meta": {
            code: META.get(code, {"name_tr": code, "name_en": code, "type": "currency"})
            for code in rates_out.keys()
        },
    }

    if errors:
        payload["source_errors"] = errors
    if warnings:
        payload["source_warnings"] = warnings

    return payload



def source_date_is_today_tr(value):
    if not value:
        return False
    text = str(value).strip()
    parsed = None
    for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            parsed = datetime.strptime(text, fmt).date()
            break
        except ValueError:
            continue
    if parsed is None:
        return False
    return parsed == datetime.now(ZoneInfo("Europe/Istanbul")).date()

def write_payload_atomic(payload):
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp_file = OUT_FILE.with_suffix(OUT_FILE.suffix + ".tmp")
    tmp_file.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    tmp_file.replace(OUT_FILE)


def main():
    truthy = {"1", "true", "yes"}
    require_tcmb = os.environ.get("HESAPICA_REQUIRE_TCMB", "").strip().lower() in truthy
    require_fresh_tcmb = os.environ.get("HESAPICA_REQUIRE_FRESH_TCMB", "").strip().lower() in truthy

    payload = build_payload(require_tcmb=require_tcmb)

    if require_fresh_tcmb:
        tcmb_update = payload.get("source_updates", {}).get("tcmb")
        if not source_date_is_today_tr(tcmb_update):
            print(
                f"TCMB source date is not today's Türkiye date ({tcmb_update!r}); "
                "rates.json was left unchanged."
            )
            return

    write_payload_atomic(payload)
    print(f"Wrote {OUT_FILE} with {len(payload['rates_try'])} rates")


if __name__ == "__main__":
    main()
