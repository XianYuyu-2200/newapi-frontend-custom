# NewAPI Frontend Custom

This repository contains the frontend source exported from the currently maintained NewAPI workspace. It is intended for frontend development and review; it does not contain production credentials, runtime data, Docker volumes, compiled images, or `node_modules`.

## Layout

- `default/`: current default React frontend.
- `classic/`: legacy/classic React frontend.
- `package.json`: npm workspaces definition.

## Local development

Use a recent Node.js LTS release and install dependencies locally:

```bash
npm install
npm --workspace newapi-web run dev
```

For a production build check:

```bash
npm --workspace newapi-web run build:check
```

## Collaboration rules

1. Do not commit `.env` files, API keys, OAuth secrets, database exports, user data, Docker images, or build artifacts.
2. Create feature branches from `develop` and submit a pull request for review.
3. Test frontend changes locally or in a separate staging environment. Do not build or edit directly on the production server.
4. Preserve the existing user-facing customisations, including Chinese terminology, consumer-reward pages, invitation-reward pages, home-page content, and tutorial entry points unless a change is explicitly approved.

## Production release

Production deployment is Docker-based. Build and test outside production first, then provide a reviewed image/artifact and a rollback plan. A production release must be backed up and approved before the NewAPI container is replaced.
