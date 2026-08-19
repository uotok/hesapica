# HESAPICA — GLOBAL ENGLISH MASTER MAP

**Status:** Rebuilt from the latest Turkish GitHub master reference

## Architecture

- Turkish site remains at `/` with 46 Turkish calculators.
- Global English site lives under `/en/`.
- Only country-independent tools are translated: **24 calculators**.
- Turkey-specific calculators are intentionally not exposed in English at this stage.
- Each English calculator has a natural English slug, self-canonical URL, and reciprocal TR/EN hreflang with its real Turkish counterpart.
- English calculator implementations follow the Turkish product standard: rich form/result layout, validation, presets/example/reset, detailed metrics/tables where useful, copy/share/print, state persistence, responsive behavior, FAQ/schema and related tools.

## 24 Global Calculator Pairs

| # | Turkish source | English title | English URL | Category |
|---:|---|---|---|---|
| 1 | `/arac-aylik-maliyet-hesaplama` | Car Monthly Cost Calculator | `/en/car-monthly-cost-calculator` | Cars |
| 2 | `/borc-kapama-plani` | Debt Payoff Calculator | `/en/debt-payoff-calculator` | Finance |
| 3 | `/butce-hesaplama` | Budget Calculator | `/en/budget-calculator` | Finance |
| 4 | `/doviz-cevirici` | Currency Converter | `/en/currency-converter` | Finance |
| 5 | `/enflasyon-hesaplama` | Inflation Calculator | `/en/inflation-calculator` | Finance |
| 6 | `/eticaret-kar-hesaplama` | E-commerce Profit Calculator | `/en/ecommerce-profit-calculator` | Business |
| 7 | `/ev-amortisman-hesaplama` | Rental Property Calculator | `/en/rental-property-calculator` | Property |
| 8 | `/faiz-hesaplama` | Interest Calculator | `/en/interest-calculator` | Finance |
| 9 | `/geri-sayim-hesaplama` | Countdown Calculator | `/en/countdown-calculator` | Everyday |
| 10 | `/gunluk-su-ihtiyaci-hesaplama` | Water Intake Calculator | `/en/water-intake-calculator` | Health |
| 11 | `/ideal-kilo-hesaplama` | Ideal Weight Calculator | `/en/ideal-weight-calculator` | Health |
| 12 | `/iki-tarih-arasi-gun-hesaplama` | Days Between Dates Calculator | `/en/days-between-dates-calculator` | Date & Time |
| 13 | `/indirimli-fiyat-hesaplama` | Discount Calculator | `/en/discount-calculator` | Everyday |
| 14 | `/kalori-ihtiyaci-hesaplama` | Calorie Calculator | `/en/calorie-calculator` | Health |
| 15 | `/km-maliyet-hesaplama` | Cost per Kilometer Calculator | `/en/cost-per-kilometer-calculator` | Cars |
| 16 | `/kredi-hesaplama` | Loan Calculator | `/en/loan-calculator` | Finance |
| 17 | `/kripto-kar-hesaplama` | Crypto Profit Calculator | `/en/crypto-profit-calculator` | Investing |
| 18 | `/ortalama-hesaplama` | Average Calculator | `/en/average-calculator` | Math |
| 19 | `/varlik-getirisi-hesaplama` | Asset Return Calculator | `/en/asset-return-calculator` | Investing |
| 20 | `/vucut-kitle-indeksi` | BMI Calculator | `/en/bmi-calculator` | Health |
| 21 | `/yakit-hesaplama` | Fuel Cost Calculator | `/en/fuel-cost-calculator` | Cars |
| 22 | `/yas-hesaplama` | Age Calculator | `/en/age-calculator` | Date & Time |
| 23 | `/yatirim-getirisi-hesaplama` | Investment Return Calculator | `/en/investment-return-calculator` | Investing |
| 24 | `/yuzde-hesaplama` | Percentage Calculator | `/en/percentage-calculator` | Math |

## Deliberately excluded from English

The remaining Turkish calculators are country-specific or rely on Turkey-specific rules/data. They stay Turkish-only for now. No fake English counterpart or unrelated hreflang target is created.

## Source-of-truth rule

For global pairs, the Turkish production tool is the reference for product depth and UX standard. English tools may use country-neutral formulas where the Turkish engine contains Turkey-specific taxes, fees or regulatory assumptions (for example loan/interest calculations), but they must not be simplified generic shells.
