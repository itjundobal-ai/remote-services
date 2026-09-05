# Remote Services

Live service-booking website for PC/laptop support, printer/Wi-Fi troubleshooting, Windows/software setup, resume/document work, graphics/layout, simple websites and other digital requests.

## Current features

- Responsive service landing page with repair-themed background
- Service pricing and ₱199 introductory remote check-up promo
- Online booking form using phone contact
- Messenger booking shortcut to the configured Facebook Page inbox
- Optional browser location sharing for Home Service only
- Cloudflare Pages Function API at `/api/bookings`
- D1 booking storage with automatic `bookings` table creation
- Private admin page at `/admin.html`
- Admin access protected by `ADMIN_KEY`
- Booking statuses: New, Contacted, Scheduled, In Progress, Done, Cancelled
- Admin search by name, reference, service, contact and details
- Admin filters by status and service type
- Admin status summary cards
- Call button from the admin booking card
- Open customer pin in Google Maps when location was voluntarily shared

## Cloudflare setup still required once

The code is ready, but Cloudflare must have these project bindings before the API can store bookings:

1. Create a Cloudflare D1 database, suggested name: `remote-services-db`.
2. Open the Cloudflare Pages project for `remote-services`.
3. Go to Settings / Bindings and add a D1 database binding.
4. Variable name must be exactly `DB` and select `remote-services-db`.
5. Add an encrypted environment variable named exactly `ADMIN_KEY` with a strong private value known only by the owner.
6. Make sure the Pages project is connected to this GitHub repository and deploys the `main` branch.
7. After bindings are saved, redeploy if Cloudflare did not automatically deploy the latest commit.

The bookings table is created automatically by the Pages Function on first use, so no manual SQL migration is required.

## Admin

Open `/admin.html` on the live Pages domain and enter the same `ADMIN_KEY` configured in Cloudflare. The key is stored only in browser session storage for that tab/session and is sent as a Bearer authorization header to the booking API.

## Privacy and safety

Remote connections must be explicitly authorized by the customer. Customers should never send passwords, PINs or banking credentials through the booking form. Location sharing is optional and only attached after the customer grants browser geolocation permission.

## Launch test checklist

- Open the public homepage on the deployed domain.
- Submit a test Phone booking.
- Confirm a reference number is returned.
- Open `/admin.html` and verify the booking appears.
- Change the booking status and refresh.
- Test search and status/type filters.
- Test Home Service location sharing only with a test device and voluntary permission.
- Verify the Google Maps location button appears only when coordinates were shared.
- Test the Messenger button and confirm it opens the intended Facebook Page inbox.
