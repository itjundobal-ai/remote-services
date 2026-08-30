# Remote Services

Live service-booking website for PC/laptop support, printer/Wi-Fi troubleshooting, Windows/software setup, resume/document work, graphics/layout, simple websites and other digital requests.

## Current features

- Responsive service landing page with repair-themed transparent background
- Service pricing and ₱199 introductory remote check-up promo
- Online booking form
- Optional location sharing for Home Service only
- Cloudflare Pages Function API at `/api/bookings`
- D1 booking storage
- Private admin page at `/admin.html`
- Booking statuses: New, Contacted, Scheduled, In Progress, Done, Cancelled
- Open customer pin in Google Maps when location was voluntarily shared
- Call button from the admin booking card

## Cloudflare setup still required once

The code is complete, but Cloudflare must have these project bindings before the API can store bookings:

1. Create a Cloudflare D1 database, suggested name: `remote-services-db`.
2. Open the Cloudflare Pages project for `remote-services`.
3. Go to Settings / Bindings and add a D1 database binding.
4. Variable name must be exactly `DB` and select `remote-services-db`.
5. Add an encrypted environment variable named exactly `ADMIN_KEY` with a strong private value known only to the owner.
6. Redeploy the latest Git commit if Cloudflare does not automatically redeploy after the bindings are saved.

The bookings table is created automatically by the Pages Function on first use, so no manual SQL migration is required.

## Admin

Open `/admin.html` on the live Pages domain and enter the same `ADMIN_KEY` configured in Cloudflare. The key is stored only in the browser session storage for that tab/session and is sent as a Bearer authorization header to the booking API.

## Privacy and safety

Remote connections must be explicitly authorized by the customer. Customers should never send passwords, PINs or banking credentials through the booking form. Location sharing is optional and only attached after the customer grants browser geolocation permission.
