# Murshid

Your Virtual Tour Guide — a private travel operations and traveller portal by Buy Your Trips, part of Fajr Legacy Group.

## Current MVP

- Booking dashboard, trip dates/status and coordinator details.
- Family traveller lists and day-by-day flight, hotel, tour and transfer itinerary.
- Draft/published trip visibility, destination directory with sources and verification dates.
- Private PDF/JPEG/PNG uploads with content signatures and staff/customer visibility.
- Booking-linked support requests, coordinator/traveller replies and resolution.
- Email-bound booking access grants and revocation; server-side authorization and audit records.
- Mobile layouts, traveller layout preview and printable active trip sections.

Private hosted workspace: https://murshid.solar-genet-0398.chatgpt.site

## Architecture

React + TypeScript with Vinext, Cloudflare Workers, D1 relational records and R2 private documents. Sites handles hosted sign-in and private-site admission. Local test identity adapters are isolated in the test process; never enable synthetic identity in a hosted application.

Only the configured owner email is an administrator in this MVP. A customer must be admitted to the private Site AND have an active booking email grant. Only published bookings and customer-visible files are exposed. Booking grants send no invitation email. The traveller preview is a layout mode, not another authenticated account.

## Development

Use Node 24 and pnpm 10. Install with `pnpm install --frozen-lockfile`, then:

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm dev
```

Hosted publication uses the Sites workflow. `.openai/hosting.json` binds the existing project, D1 `DB` and R2 `BUCKET`; preserve its identity when updating this deployment. A fresh independent deployment needs its own registration and storage bindings.

For local D1 setup, build once, then apply each SQL migration in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_slow_the_fury.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_last_thunderbolt.sql
```

Do not replay applied migrations. Hosted publication applies pending schema migrations separately.

## Verification

`pnpm test` runs actual API handlers against in-memory SQLite and a mock object store: login denial, booking lifecycle, customer write denial, draft visibility, cross-booking isolation, support replies/resolution, file visibility/download, content signature rejection, access revocation, date/timezone validation and cross-origin write rejection. These are handler integration tests, not proof of platform sign-in, real D1/R2 networking or browser print output.

## Remaining rollout work

Complete a signed-in owner walkthrough and separate customer-account checks before customer rollout. Roam Desk synchronization, multiple staff roles, individual adult file permissions, automatic reminders, medical profiles, AI/voice/avatar and rewards remain future work. No emergency directory content, production customer data or logo approximations are seeded.

See `docs/IMPLEMENTATION.md` for status. Existing Apache 2.0 license is retained.
