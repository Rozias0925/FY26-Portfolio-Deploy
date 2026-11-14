# Bilingual website release — 1.2.0

Date: 14 November 2026, Asia/Taipei.

## Content and navigation

The guide now has complete English and Traditional Chinese versions: the homepage, nine chapters, 58 glossary definitions and examples, browser illustration, local implementation, reproduction instructions, and verification summaries.

The language control appears directly to the left of Researcher Profile. It uses the URL parameter `lang=en` or `lang=zh`, preserving the current chapter, section anchor, and other query parameters. Language selection uses ordinary links and adds no cookies, browser storage, tracking, or backend requests.

- [English guide](https://rozias0925.github.io/FY26-Portfolio-Deploy/?lang=en)
- [Traditional Chinese guide](https://rozias0925.github.io/FY26-Portfolio-Deploy/?lang=zh)

English and Chinese glossary entries share the same term IDs. English definitions and examples accompany the original Chinese term as a secondary bilingual label. Historical screenshots, raw JSON, execution output, and source snapshots retain their original language, content, and dates; the English interface explains their provenance.

The browser demonstration uses identical computation in both languages. It remains a separate JavaScript illustration. The Python system uses the existing fixed-rule synthetic computation, and original Factor GCN integration remains `NOT INTEGRATED`.

## Verification

Full verification was recorded at `2026-11-14T13:43:37.682656+08:00` with Windows / CPython 3.12.14.

| Check | Result |
| --- | --- |
| Python tests | 141 passed, 1 deprecation warning, 32.43s |
| Website checks | 46 passed, 0 failed |
| Dependency consistency | pip check passed |
| Source manifest | 52 files |
| Website artifact manifest | 36 files |
| English chapter rendering | All nine checked; no untranslated Chinese prose or horizontal overflow |
| Language switching | Both directions preserve the chapter; a section anchor was also verified |
| Browser illustration | Scenario B / high settings, Request and Response tabs, and provenance checked |
| Glossary | 58 entries, API search, chapter filter, empty result, and reset checked |
| Mobile 390 × 844 | Language control position, menu, glossary, metrics, and horizontal overflow checked |

Source aggregate SHA256: `890b8e2ca7863b891945cc56413627ce317719c4b9a0b8ec2a5c3ef491e285a5`.

Evidence: [verification report](evidence/verification.json), [native runner record](evidence/native-verification-20261114-bilingual-final.json), [website checks](evidence/website-contract.txt), and [browser checks](evidence/bilingual-local-browser-20261114.json).

## Execution scope

The Docker result remains the independent 13 November record: 12 HTTP checks and 6 dashboard interactions. Its 20 tested runtime source files were checked again before the record was attached to this release. Docker was kept stopped throughout this website update.

Browser QA used a temporary loopback static preview serving only `web/`. The preview and its test tabs were closed afterwards. The API, Streamlit, and other existing background work were not launched or stopped for browser QA; automated tests used their own short-lived local test processes.

The previous verification snapshot remains archived in the original workspace under `docs/evidence/history/20261114-before-bilingual/`. The preceding public source version is preserved in GitHub commit `9f930732ced026077557dd8cf8acc5318fab8a1d`.
