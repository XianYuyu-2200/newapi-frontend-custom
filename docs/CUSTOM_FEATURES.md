# Existing custom frontend areas

The following existing features are part of the current user experience and must be preserved unless a change is explicitly approved.

## Wallet and activity pages

- Wallet route: `default/src/routes/_authenticated/wallet/index.tsx`
- Wallet feature: `default/src/features/wallet/`
- Consumption-reward administration: `default/src/features/system-settings/general/consume-reward-settings-section.tsx`
- User reward calendar: `default/src/features/profile/components/checkin-calendar-card.tsx`
- Administrator reward report: `default/src/features/usage-logs/components/consume-reward-report.tsx`

## Invitation and redemption flows

Invitation-related rendering and reward transfers are located in the wallet feature. Preserve the distinction between an invitation reward balance and normal usable wallet balance.

## Chinese user interface

Chinese UI copy is maintained in the frontend locale files. Do not replace translations wholesale with upstream English text.

## Home page and tutorial

The production home-page content, QR image, and tutorial assets are deployed as separately managed static/server configuration. They are deliberately not included here because they are not frontend source and may change without a frontend build.

## Backend contract note

The production backend includes custom reward/check-in API logic. Before changing any frontend request shape, coordinate with the backend maintainer and test against a staging API; do not infer or alter production endpoints by trial and error.
