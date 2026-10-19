# Recon map: Income Expense- daily expenses (Android)

Scope: the core loop. Log income and expenses, categories, payment methods, monthly budgets, reports and charts, local backup. No cloud accounts.
For: the user's own first trial clone, personal finance, offline first.
Date: 2026-10-19

Evidence level: this map is built from the public Play Store listing text only. The 18 listing screenshots could not be downloaded (the image host is blocked in this environment), so every screen, flow and component below is INFERRED from the feature list. Rows marked `guess` need confirming against screenshots or the user's own install before /replica-build.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Play Store listing | https://play.google.com/store/apps/details?id=incomeexpense.incomeexpense | description read verbatim; developer ANKIT SARAF; "Contains ads", "In-app purchases"; rating about 4.7 to 4.8 with about 26K reviews (page shows several figures, treat as approximate) |
| 2 | Developer page | https://pegasusandroidapps.web.app | listed on the Play page, not read yet |
| 3 | Screenshots (18) | same Play page | not retrieved, image host blocked |

## Core loop

Open the app, add an income or expense with category, amount, payment method and optional note or receipt photo, then see the balance, the monthly budget and the category pie chart update.

## Screens (all inferred, confidence: guess)

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Home / summary | app launch | total income, total expense, balance, recent transactions | summary cards, transaction list, add button | empty, filled |
| S02 | Add / edit transaction | add button, tap a row | enter one income or expense | type toggle, amount, category picker, payment method picker, date, note, photo attach, recurring toggle | new, edit, validation error |
| S03 | Transaction list / history | home or tab | browse and filter | list, filter bar | empty, filled |
| S04 | Categories | settings or add screen | pick, create, edit, delete categories | list, add/edit dialog | default set, custom |
| S05 | Payment methods | settings | manage cash, bank, cards, wallets | list, add/edit dialog | default set, custom |
| S06 | Budgets | tab or settings | monthly budget per category | category rows, amount inputs, progress | unset, within, over |
| S07 | Reports | tab | filter and export | filters (date, category, payment method, notes, amount), PDF and Excel export buttons | empty, filled |
| S08 | Charts | tab | pie charts by category for spending and income | pie chart, legend, period picker | empty, filled |
| S09 | Reminders | add screen or settings | recurring transaction reminders | schedule picker, notification | none, set |
| S10 | Settings / security | menu | fingerprint lock, backup, restore | toggles, Drive folder picker | lock off, on |
| S11 | Backup / restore | settings | save locally and to Google Drive | buttons, status | no backup, backed up |

## Flows

```
F01 Add an expense
    S01 -> S02 -> S01
    happy path clicks: about 5 (add, amount, category, save) guess
    edge: no amount, future date, deleted category, photo permission denied

F02 Set a monthly budget and watch it
    S06 -> S01 / S06
    edge: spending above budget, month rollover

F03 Review a month
    S03 / S08 -> S07 (filter) -> export
    edge: empty period, large export

F04 Recurring transaction reminder
    S02 (recurring on) -> S09 -> notification
    edge: reboot, notification permission denied

F05 Lock and backup
    S10 -> S11
    edge: Drive sign-in failure, restore over existing data, fingerprint unavailable
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary, secondary, text | default, pressed, disabled | all |
| Amount input | income, expense | empty, valid, error | S02, S06 |
| Picker (category, payment method) | list, dialog | default, selected | S02, S04, S05 |
| Transaction row | income, expense | default, with note, with photo | S01, S03 |
| Summary card | income, expense, balance | filled, zero | S01 |
| Pie chart | spending, income | empty, filled | S08 |
| Budget progress bar | within, near, over | default | S06 |
| Filter bar | date, category, method, note, amount | none, active | S03, S07 |
| Dialog | add, edit, confirm delete | default | S04, S05, S10 |

## Inferred data model

```
Category       id, name, type (income | expense), is_default
               evidence: listing "predefined categories or create your own, edit or delete"
               confidence: high
PaymentMethod  id, name, kind (cash | bank | card | wallet)
               evidence: listing "multiple payment methods such as cash, bank, cards, wallets"
               confidence: high
Transaction    id, type (income | expense), amount, date, category_id, payment_method_id,
               note, receipt_photo, recurring_rule_id
               evidence: listing notes, photos, recurring reminders
               confidence: high for fields listed, guess for the rest
RecurringRule  id, transaction template, frequency, next_run
               evidence: listing "reminders for recurring transactions"
               confidence: medium
Budget         id, category_id, month, amount
               evidence: listing "monthly budgets for each category"
               confidence: high
Settings       lock_enabled, backup_folder, currency
               evidence: listing "fingerprint password", "Google Drive folder"
               confidence: medium
```

Relationships: Category 1-n Transaction, PaymentMethod 1-n Transaction, Category 1-n Budget, RecurringRule 1-n Transaction.

## Feature matrix

See `features.csv`. Must: 8, should: 6, could: 3, skip: 2.

## Out of scope (cannot or should not be cloned)

- Their ads and in-app purchase setup (the listing says "Contains ads", "In-app purchases"; what is sold is not stated, so the clone chooses its own model).
- Their exact icons, illustrations, colours, wording and screenshots.
- Their default category list wording, written fresh instead.

## Size

Screens 11 (inferred), flows 5, entities 6. Hard parts: local database with backup and restore, PDF and Excel export, Google Drive backup with Google's own API, recurring reminders and notifications, fingerprint auth. Size: M (a few weeks as a mobile app; S as a web or PWA version without the Android-only pieces).
