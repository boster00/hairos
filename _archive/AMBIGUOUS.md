# Ambiguous modules (left in place)

These areas still contain **CJGEO-branded tutorial strings**, env flags like `CJGEO_DEV_FAKE_AUTH`, or product-specific copy. They are **runtime-critical** (content-magic, billing, APIs) or **large refactors**; renaming every string risks breaking tests and dev mocks without a full product rename pass.

| Area | Reason left in repo |
|------|---------------------|
| `libs/content-magic/**` | Tutorial titles and prompts reference “CJGEO Tutorial N…”. Functional rules; wholesale rename needs coordinated copy + tests. |
| `libs/content-pipeline/**`, `libs/content-magic/devFakeArticles.js` | Uses `CJGEO_DEV_FAKE_AUTH` env for local mocks; tied to existing dev workflows. |
| `app/api/**` routes checking `CJGEO_DEV_FAKE_AUTH` | Security/dev gates; changing names requires updating all `.env` docs and scripts together. |
| `libs/monkey/**` | Comments say “CJGEO credits”; billing/metering core — keep Stripe + metering behavior; comment-only branding could be a follow-up. |
| `libs/reference-for-ai/**`, `libs/icp/**` | Reference JSON / ICP schema field names like `howSolutionHelps` are generic; embedded HTML examples are sample data, not live CJGEO product. |
| `components/ui/Sidebar/SidebarHeader.js` | If still present, may show hardcoded title — verify after template rebrand. |
| `config.js` `auth.callbackUrl` | Still `/content-magic` (valid app route); not CJGEO-specific. |

When you pick a final product name, do a **single pass**: replace env prefix `CJGEO_*` with `APP_*` or similar, then update scripts and docs together.
