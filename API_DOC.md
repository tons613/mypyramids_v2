# Pyramids Diagnostics API

Base URL: `http://localhost:8000` (development) or the deployed API URL.

## Response contract

JSON endpoints return:

```json
{ "success": true, "msg": "Success", "data": {} }
```

Errors use the same envelope with `success: false`, a useful `msg`, and `data.detail`.

Send `Authorization: Bearer <access_token>` on authenticated endpoints.

## Authentication

| Method | Endpoint                    | Auth | Purpose                             |
| ------ | --------------------------- | ---- | ----------------------------------- |
| POST   | `/auth/createuser`          | No   | Create a user                       |
| POST   | `/auth/loginwithphone`      | No   | Resolve a phone number to an email  |
| POST   | `/auth/get_user_with_phone` | No   | Get a minimal user profile by phone |
| POST   | `/auth/create_patial_user`  | No   | Create a partial user               |
| PUT    | `/auth/verify_phone`        | Yes  | Verify/update phone                 |
| PUT    | `/auth/add_profile`         | Yes  | Complete a profile                  |
| PUT    | `/auth/add_profile/doc`     | Yes  | Complete a provider profile         |

The successful auth responses are wrapped in `ApiResponse`. Login itself is handled by the Firebase authentication flow; this API does not issue a password login token.

## User

`GET /user/get_profile` requires authentication and currently returns a bare `UserProfile` for compatibility with the existing client. This endpoint is the remaining exception to the shared envelope contract.

## Test catalog and packages

| Method | Endpoint                                          | Auth | Response data                |
| ------ | ------------------------------------------------- | ---- | ---------------------------- |
| GET    | `/testlist`                                       | No   | `tests` and cursor paging    |
| GET    | `/testlist/categories`                            | No   | `categories`                 |
| GET    | `/testlist/all`                                   | No   | Full tests and categories    |
| GET    | `/testlist/search?search_term=...&page=1&size=10` | No   | Search results and paging    |
| GET    | `/testlist/{test_id}`                             | No   | One test                     |
| GET    | `/healthpackages`                                 | No   | `packages`                   |
| POST   | `/heathpackages/create`                           | No   | Created package              |
| GET    | `/get_recommendations`                            | Yes  | Up to five recommended tests |
| GET    | `/recommend-tests/{user_id}`                      | No   | Recommended tests            |

`/get_recommendations` returns recommended tests under `data.tests` in the shared response envelope. It excludes tests the authenticated user has already taken and tests hidden from the app catalog.

Catalog prices used for payment are the server-side `private_price` values. Client supplied test prices are not trusted.

## Orders and results

| Method | Endpoint                               | Auth | Purpose                                      |
| ------ | -------------------------------------- | ---- | -------------------------------------------- |
| GET    | `/get_orders_history?cursor=1&size=10` | Yes  | Patient's own orders                         |
| GET    | `/get_user_result?cursor=1&size=10`    | Yes  | Patient results with report files            |
| GET    | `/get_my_patients?cursor=1&size=10`    | Yes  | Orders created by the authenticated provider |
| GET    | `/checkreferral?refcode=...`           | Yes  | Validate a referral code                     |

Order list responses contain `data.items` and `data.paging`:

```json
{
  "success": true,
  "msg": "Success",
  "data": {
    "items": [],
    "paging": { "total": 0, "nextcursor": 0, "stop": true }
  }
}
```

`/get_user_result` items contain only `request_id`, `branch_accepted`, and `order_list`. Each order detail includes `report_file`, which is `null` until a result has been uploaded.

Provider-created orders keep the patient in `user_id` and the provider in `created_by_user_id`; this allows providers to retrieve orders they registered for patients.
`/get_my_patients` keeps the standard `data.items` and `data.paging` shape. Each item includes both `id` and `request_id`, `user_id` and `patient_id`, patient details in `patient`, creator details in `user`, and its `order_list`.

## Backend Paystack payments

The client no longer initializes Paystack directly. Never put the Paystack secret key in the client app.

### Initialize an order payment

`POST /initialize_order` requires authentication. The backend creates the unpaid order and test details, calculates the amount, and initializes Paystack.

```json
{
  "recipient": { "type": "self" },
  "orderInfo": {
    "service_type": "Visit to branch",
    "clinicalinfo": "",
    "address": "",
    "addressLandmark": "",
    "referrer": 0,
    "referName": ""
  },
  "testlist": [{ "id": 5189 }, { "id": 7 }],
  "channels": ["card", "bank_transfer"]
}
```

`channels` is optional. Supported values are `card`, `bank`, `ussd`, `qr`, `mobile_money`, and `bank_transfer`. If omitted, Paystack chooses the available methods.

Recipient types:

- `self`: the authenticated user is the patient.
- `existing`: provider only; send `{"type":"existing","patient_id":73}`.
- `new`: provider only; send `{"type":"new","patient":{...}}`.

For a new patient, `email` is optional. If omitted, the backend generates a temporary internal email from the phone number and creates the Firebase account with a generated password.

The backend calculates `subtotal` from active catalog `private_price` values, applies no discount, and adds `home_service_charge` only when `service_type` is `home` (case-insensitive). Client prices, totals, and discounts are ignored.

Response:

```json
{
  "success": true,
  "msg": "Success",
  "data": {
    "reference": "pyr_generated_reference",
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "paystack_access_code",
    "amount": 7500
  }
}
```

The amount is whole naira in this API response; Paystack receives kobo. Open the returned authorization URL or use the access code with the Paystack SDK. The browser callback is not payment confirmation.

### Health package ordering

**Status: implemented in the backend and wired into the Expo checkout.**
The backend deployment must apply `alembic upgrade head` before package orders
are enabled; package purchases use separate immutable order snapshots.

#### Catalog and cart

- `/healthpackages` provides package `id`, `name`, `price`, `description`,
  `subheading`, `image`, `test_count`, and included tests under
  `test_list[].testdata`. The app displays this information and adds a package
  as one cart item at its advertised package price.
- `/initialize_order` accepts `testlist` and `packagelist`, allowing test-only,
  package-only, and mixed orders. Either list may be omitted or empty, but at
  least one selection is required. The app sends catalog package IDs separately
  and no longer blocks package payment.
- The app uses `package:<id>` as a **local cart key**, such as `package:1`, to
  avoid collisions with test IDs. This is not a backend ID and must not be sent
  in `testlist`.
- Expanding packages into standalone test IDs on the client is not a valid
  workaround: it loses package identity and charges individual `private_price`
  values instead of the package price. In the sample catalog, Wellness
  Essentials costs NGN 25,000, while its two included tests each display NGN
  2,000. Neither the displayed test prices nor their sum determines the package
  payment amount.
- Each test ID and package ID is a single selection, not a quantity-based item.
  Repeated Add to cart actions leave the cart unchanged. A compatibility guard
  rejects older saved carts with repeated quantities and asks users to re-add
  the affected selections.

#### Backward-compatible request

`POST /initialize_order` accepts an optional `packagelist`. Existing test-only
requests remain unchanged. A package-only request:

```json
{
  "recipient": { "type": "self" },
  "orderInfo": {
    "service_type": "Visit to branch",
    "clinicalinfo": "",
    "address": "",
    "addressLandmark": "",
    "referrer": 0,
    "referName": ""
  },
  "testlist": [],
  "packagelist": [{ "id": 1 }],
  "channels": ["card", "bank_transfer"]
}
```

`packagelist[].id` is the catalog package ID, not a test ID or the local cart key.
Each package/test ID may appear once; duplicates are rejected. The existing
`self`, provider `existing`, and provider `new` recipient rules still apply.

#### Implemented server behavior

1. Packages must be active, have a positive whole-naira price, contain at least
   one test, and contain only tests available in the app catalog. The server
   resolves identity, prices, and membership; client prices/totals are ignored.
2. Subtotal is standalone tests' server `private_price` values plus selected
   package prices. Included tests are not charged again. Home-service charges
   apply once per order.
3. Package identity, name, price, and membership are snapshotted at initialization.
   Included tests become ordinary reportable patient order details.
   `order_list[].package_order_id` identifies their snapshot and is `null` for
   standalone tests. Later catalog changes do not alter the initialized order.
4. A package cannot be selected with one of its included tests, and selected
   packages cannot share tests. Invalid or overlapping selections return HTTP
   422 in the shared error envelope, identifying affected IDs. The app surfaces
   the server validation error and preserves the cart for correction.
5. Package prices are allocated equally among included tests in whole naira;
   remainder naira are assigned in ascending test-ID order. Allocated
   `order_list[].amount` values sum exactly to the package price and are not
   extra charges. Partial refunds are not supported; allocated test amounts
   must not be interpreted as individual refund entitlements.
6. The existing payment response (`reference`, `authorization_url`,
   `access_code`, whole-naira `amount`) is unchanged. Checkout uses the server
   amount. Orders remain pending until the signed Paystack webhook verifies the
   payment intent; repeated delivery does not duplicate orders or test details.
7. `/get_orders_history` and `/get_my_patients` return a `packages` array on each
   order containing `package_id`, snapshotted `name`, charged `price`, and
   `test_ids`. The app displays these package purchases in order details and
   preserves test-level report viewing.

#### Acceptance checks

- Package 1 alone initializes at NGN 25,000 (before any home-service charge) and
  creates reportable details for tests 5000 and 5001 without charging them again.
- Mixed non-overlapping carts use the sum of server test and package prices.
  Test-only requests retain their current behavior.
- Provider orders keep the selected patient as the recipient and the provider
  as creator. Patients and providers can retrieve each included test's results.
- Unknown packages, invalid prices, unavailable included tests, duplicate IDs,
  empty selections, and overlapping tests return clear validation errors before
  payment is initialized.
- A package/catalog price or membership change after initialization does not
  alter the stored payable amount or included tests. Duplicate payment webhook
  delivery does not create duplicate records.
- Client-local `package:1` is sent as `packagelist: [{"id":1}]`, never as a test
  ID. No client expansion of package membership or client price is submitted.
- Quantity greater than one and partial-refund handling remain unsupported.

### Initialize a wallet top-up

`POST /initialize_wallet` requires authentication and an activated wallet:

```json
{ "amount": 5000, "channels": ["card"] }
```

It returns the same payment initialization response. The server stores the wallet intent before checkout.
The wallet UI sends the selected payment method in `channels` (a one-item array),
using `card`, `bank_transfer`, `ussd`, or `bank`.

### Paystack webhook

`POST /verify_transactions` is called by Paystack, not by the client. It requires the `X-Paystack-Signature` header calculated over the exact raw body with the Paystack secret. For `charge.success`, the server matches the reference and amount to its stored payment intent. It then confirms the order or credits the wallet. Client metadata is not used for identity, prices, or totals. Repeated delivery of a paid reference is acknowledged without a second credit.

## Virtual card wallet

| Method | Endpoint                 | Auth | Purpose                                |
| ------ | ------------------------ | ---- | -------------------------------------- |
| POST   | `/vcard/activate`        | Yes  | Create or return the user's wallet     |
| GET    | `/vcard/get_card_detail` | Yes  | Return balance and transaction history |

`data.transactions` is newest first and contains transaction ID, amount, description, type, and creation time. Internal IDs and payment references are not exposed.

### Paying for orders with wallet balance: backend requirements

**Status: proposed, not implemented or enabled in the Expo app.** Wallet
top-ups are separate from wallet-funded order payments. The following contract
must be agreed, implemented, deployed, and tested before the app offers this
payment option.

#### Scope and proposed endpoint

Wallet balance is an **additional order payment option alongside Paystack**,
not a replacement or migration away from Paystack. `/initialize_order` remains
the active endpoint for Paystack-funded orders, with its existing payment
initialization response and supported channels.

Add authenticated `POST /pay_order_with_wallet` for orders where the user
explicitly chooses Wallet balance. Reuse the existing order selection and
recipient validation, but create and pay that order directly from the payer's
wallet without initializing Paystack.

Checkout routing:

- Card, bank transfer, or another supported Paystack method:
  `/initialize_order`, followed by Paystack checkout and webhook confirmation.
- Wallet balance: `/pay_order_with_wallet`, followed by atomic server-side
  wallet debit and order payment confirmation.
- Wallet + Paystack: extend `/initialize_order` with an explicitly confirmed
  wallet contribution, reserve that contribution, and initialize Paystack for
  the remainder. See the split-payment requirements below.

All three payment paths remain supported first-class options for tests, packages,
and mixed carts. Wallet top-ups continue to use `/initialize_wallet` and Paystack.

Support full wallet payment and explicitly selected split wallet/Paystack
payment, with one of each test/package. Payment of unrelated already-created
unpaid orders is outside this proposal; retries resume the same payment intent.
Never silently switch payment modes or change the confirmed wallet contribution.

Example headers:

```http
Idempotency-Key: <unique-client-generated-key-for-this-purchase>
```

Example package-only request (test-only and mixed requests are also supported):

```json
{
  "recipient": { "type": "self" },
  "orderInfo": {
    "service_type": "Visit to branch",
    "clinicalinfo": "",
    "address": "",
    "addressLandmark": "",
    "referrer": 0,
    "referName": ""
  },
  "testlist": [],
  "packagelist": [{ "id": 1 }]
}
```

Do not accept a client wallet ID, payer ID, price, balance, discount, total, or
Paystack `channels` as payment authority. Resolve the payer and their wallet
from authentication. Preserve existing recipient rules:

- Patients pay for themselves.
- Providers may pay for themselves, an authorized existing patient, or a new
  patient using the existing `recipient` contract.
- For provider-created patient orders, debit the **provider's wallet**, not the
  patient's. Keep the patient in `user_id` and the provider as creator/payer.
- Derive payer/creator identity from authentication; do not let client referral
  fields override it. Validate any separate referral information under the
  existing referral policy.

#### Pricing, validation, and consent

- Reuse server catalog pricing: standalone tests use `private_price`; packages
  use their positive whole-naira package price. Charge included package tests
  once through the bundle, and add the home-service charge once per order.
- Preserve active/available catalog validation, package snapshots, duplicate
  and overlapping-test rejection, and included-test accounting allocation.
  Require at least one selection; quantities are not accepted.
- Reject missing/inactive wallets and insufficient funds without debiting or
  creating a paid order for full-wallet purchases. For split purchases, validate
  the confirmed contribution against the available balance. Exact-balance
  payments are valid; negative available balances are never allowed.
- Establish an explicit server-priced confirmation step before enabling direct
  wallet debit. Recommended: authenticated `POST /quote_order` accepts the same
  selection/recipient inputs and returns an opaque, payer-bound, expiring
  `quote_id`, `subtotal`, `additional_charge`, `amount`, and currency `NGN`.
  Wallet payment then requires that quote ID with the confirmed request.
  Bind the quote to the selections, recipient, service details, and price.
  Reject expired/mismatched quotes without debit. If price or availability
  changes, require a new quote and user confirmation; never silently debit
  more than the confirmed amount. Finalize this quote schema with the frontend.
- Store money as integer minor units internally (or another exact money type),
  never floating-point balances. Public amounts remain whole naira, matching
  the existing API; document currency and conversion consistently.

#### Atomic debit, order creation, and idempotency

1. Use one database transaction for the wallet balance update, debit ledger
   entry, order/payment record, package snapshots, and included test details.
   Lock the wallet row or use an equivalent conditional atomic debit so two
   simultaneous purchases cannot overspend. Coordinate with concurrent top-up
   credits so neither update is lost.
2. Mark the order **paid** only when that transaction commits. Preserve the
   existing diagnostic workflow status: payment does not mean branch acceptance,
   test completion, or result readiness. Do not call or fabricate a Paystack
   webhook for wallet payments.
3. Require an idempotency key scoped to the authenticated payer and operation.
   Enforce database uniqueness and bind the key to the canonical purchase
   inputs/quote. Same key and same inputs replay the original success without
   another debit; same key with different inputs returns HTTP 409. Concurrent
   requests with the same key must produce one order and one debit.
4. After a network timeout, a retry with the same key must resolve the committed
   outcome even if the original response was lost. Check a completed replay
   before rejecting an expired quote. Publish the key retention/retry policy.
5. On validation failure or transaction failure, roll back all database changes;
   do not leave a debit without an order, a paid order without a debit, or
   partially created package/test records. Send notifications only after commit.
6. New-patient Firebase creation is external to the database transaction.
   Define a retry-safe provisioning/compensation strategy so retries do not
   create duplicate patients and provisioning failure cannot debit the wallet.

#### Success response and read endpoints

Return the shared envelope only after durable payment completion. Proposed
response fields:

```json
{
  "success": true,
  "msg": "Order paid with wallet",
  "data": {
    "request_id": 42,
    "order_reference": "ORD-2026-0042",
    "payment_method": "wallet",
    "payment_status": "paid",
    "currency": "NGN",
    "subtotal": 25000,
    "additional_charge": 0,
    "amount": 25000,
    "wallet_balance": 5000
  }
}
```

- Do not return a Paystack access code or authorization URL for wallet payments.
  `wallet_balance` is the balance after the purchase; an idempotency replay
  repeats the original response, so the app should refresh for the latest balance.
- `/get_orders_history` and `/get_my_patients` must include paid wallet orders,
  retain package snapshots and test-level reports, and expose documented
  additive payment-method/status fields. Preserve current ownership checks.
- `/vcard/get_card_detail` must reflect the committed balance and one debit
  transaction with a stable transaction ID, signed negative amount (or a
  documented equivalent), order description, debit type, and creation date.
  Internal payment secrets and other users' wallet data must not be exposed.
- Maintain an auditable relationship between the wallet ledger, payer, order,
  and idempotency record. A client cannot manufacture wallet credits or mark
  orders paid.

#### Errors and remaining policies

Use appropriate HTTP status codes with `success: false`, an actionable `msg`,
and `data.detail`. Publish stable machine-readable codes (proposed `data.code`):

| HTTP | Proposed code | Meaning |
| --- | --- | --- |
| 401 | `AUTH_REQUIRED` | Missing/expired authentication |
| 403 | `RECIPIENT_FORBIDDEN` | Recipient is not permitted for this payer |
| 404 | `WALLET_NOT_FOUND` | Payer has not activated a wallet |
| 409 | `WALLET_INACTIVE` | Wallet is inactive/blocked |
| 409 | `INSUFFICIENT_FUNDS` | Current balance cannot cover the confirmed total |
| 409 | `IDEMPOTENCY_CONFLICT` | Key reused with different purchase inputs |
| 409 | `QUOTE_EXPIRED_OR_CHANGED` | Quote needs renewal/user confirmation |
| 422 | `INVALID_ORDER_SELECTION` | Empty, unavailable, duplicate, or overlapping selections |
| 503 | `PAYMENT_TEMPORARILY_UNAVAILABLE` | Purchase did not complete; retry safely with the same key |

For insufficient funds, return permitted payer-only balance/required-amount
details so the app can offer top-up. Do not return success for a pending or
failed debit. Limit abuse of purchase/provisioning endpoints and record
operational failures without logging tokens or sensitive patient data.

Cancellation does not automatically credit the wallet. Refunds need a separately
approved, authorized, idempotent reversal policy linked to the original debit,
with limits preventing refunds beyond the amount paid. Partial package refunds
remain unsupported. Preserve original ledger entries; use reversal entries
instead of deleting financial history.

#### Acceptance tests and frontend handoff

- Test-only, package-only, and mixed non-overlapping purchases charge server
  prices exactly once, preserve recipient/creator identity, and create all
  reportable test details. Test both branch and home collection.
- Exact-balance payment succeeds with zero remaining balance. Insufficient,
  missing, or inactive wallets cause no debit or paid order.
- Two concurrent purchases whose combined amounts exceed the balance cannot
  both succeed. Concurrent top-up and purchase preserve both ledger updates.
- Duplicate and concurrent same-key requests create one debit/order; changed
  payloads conflict. A timeout after commit is recovered by replaying the key.
- Quote expiry, changed prices, tampered totals/IDs, forbidden recipients,
  unavailable tests/packages, and overlaps are rejected without payment.
- Inject failures during order, snapshot, test-detail, ledger, and patient
  provisioning steps; verify rollback/compensation and retry behavior.
- Verify balance/transaction reads, patient/provider history, and results after
  purchase. Existing Paystack orders and top-ups must remain unchanged.
- Publish the final endpoint/quote schemas, error codes, idempotency policy, and
  database migration/deployment steps. The frontend can then add Wallet balance
  to order payment methods, confirm the server quote, send one stable key per
  purchase/retry, and refresh wallet/order data after success. Never deduct
  locally or retry a timed-out purchase with a fresh key automatically.

#### Split wallet + Paystack payments

**Status: proposed, not implemented.** Split payments supplement Paystack-only
and full-wallet checkout; they do not replace either option.

For an NGN 10,000 order with NGN 3,500 available in the payer's wallet, checkout
shows and confirms:

| Component | Amount |
| --- | --- |
| Order total | NGN 10,000 |
| Wallet contribution | NGN 3,500 |
| Paystack remainder | NGN 6,500 |

The recommended UI is an opt-in **Use wallet balance** control. The server quote
should propose `min(available_balance, order_total)` as the contribution and
return the complete breakdown for confirmation. Do not automatically use wallet
funds without consent. If the contribution covers the whole order, use the
full-wallet path without Paystack. Zero contribution uses Paystack-only checkout.

##### Proposed initialization contract

Extend authenticated `POST /initialize_order` with optional split fields;
existing Paystack-only requests remain unchanged. Use the same payer-bound quote
and idempotency protections described above. Example additions to the normal
order request:

```json
{
  "quote_id": "opaque_confirmed_quote_id",
  "wallet_contribution": 3500,
  "channels": ["card"]
}
```

Send the existing `recipient`, `orderInfo`, `testlist`, and `packagelist` fields
alongside these additions. `wallet_contribution` is the requested use of funds,
not trusted pricing or balance: validate it as positive whole naira, bind it to
the confirmed quote, and require it to be strictly less than the order total
for split checkout. Reject insufficient available funds or changed quotes and
request reconfirmation; do not silently reduce the contribution.

Proposed split response data:

```json
{
  "reference": "pyr_generated_reference",
  "authorization_url": "https://checkout.paystack.com/...",
  "access_code": "paystack_access_code",
  "amount": 6500,
  "order_amount": 10000,
  "wallet_contribution": 3500,
  "payment_method": "wallet_paystack",
  "payment_status": "pending",
  "reservation_expires_at": "2026-11-08T15:00:00Z"
}
```

For this path, `amount` is explicitly the Paystack remainder in whole naira;
`order_amount` is the complete payable total. Store and verify both. The frontend
must display the full breakdown, never present the remainder as the order total,
and resume the returned access code rather than start a new client transaction.
Finalize these additive fields and the quote schema with the frontend.

##### Reservation and settlement lifecycle

1. Atomically create the pending order/payment intent and reserve the confirmed
   wallet contribution. Track posted balance, reserved funds, and available
   balance separately; available balance equals posted balance minus active
   reservations. A reservation is not a final debit or confirmed order payment.
2. Persist an attempt linked to the order, reservation, payer, quote, and Paystack
   reference. Initialize Paystack for the remainder only. The external Paystack
   call is not part of a database transaction: use a durable state machine and
   reconciliation for timeouts and ambiguous initialization results. Never
   create another intent/hold merely because a response was lost.
3. On a verified successful webhook, match reference, currency, and the expected
   remainder. In one database transaction, consume the hold, post one wallet
   debit, record the Paystack payment, and mark the whole order paid. Both parts
   must be accounted for; the browser success callback cannot finalize a debit.
4. Same-key retries return the existing intent/access code or its final status,
   not a new order/reservation. Duplicate or concurrent webhooks settle once.
   Publish an authenticated intent-status/resume API so the app can recover a
   timed-out request or checkout without inventing another payment attempt.
5. Definitive failure/expiry releases the hold exactly once and leaves the order
   unpaid. Closing checkout or receiving a client cancellation callback is not
   proof of failure: Paystack may still complete an asynchronous payment.
   Reconcile provider status before releasing funds; document the hold lifetime,
   expiry worker, retry rules, and what the user sees while funds are reserved.
6. Handle late success after release explicitly. Prefer preventing/reconciling
   settlement on expired attempts where the provider supports it. If a payment
   succeeds after the hold is gone, do not silently debit newly available funds,
   overdraw the wallet, or mark the underfunded order paid. Persist an exception
   state and use a documented idempotent Paystack refund or authorized recovery
   process. Never discard the webhook or lose the received money.
7. A new payment attempt after definitive failure must revalidate available
   funds, pricing/quote, and user consent. Link attempts to the same purchase,
   ensure old references cannot settle it twice, and prevent overlapping holds.

##### Wallet reads, history, and operational requirements

- Extend wallet reads with documented `reserved_balance` and `available_balance`
  fields while defining the existing balance field as posted balance. All debit
  checks use available funds, including full-wallet purchases. The app should
  show reserved contributions as pending, not as completed payments.
- Preserve auditable reservation creation, consumption, release, and reversal
  records. Order history exposes the total and wallet/Paystack breakdown with
  payment state; package snapshots and test results work identically across
  payment methods.
- Reconciliation must cover provider initialization timeouts, missed/delayed
  webhooks, expired holds, and late payment success. Provide alerts and a
  documented resolution path for exceptional money states.
- Refund/cancellation policy must specify which source receives each reversal,
  never exceed each source's settled contribution, and prevent duplicate refunds.
  Split payment does not automatically enable partial package refunds.

##### Split-payment acceptance tests

- NGN 10,000 total and NGN 3,500 contribution reserves NGN 3,500 and initializes
  Paystack for NGN 6,500. Settlement creates exactly one debit and one paid order.
- Wallet-only and Paystack-only flows remain unchanged. Test split purchases
  for standalone tests, packages, mixed carts, providers, and home collection.
- Concurrent purchases and top-ups cannot overspend or lose balance updates.
  Full-wallet purchases cannot consume another intent's reserved funds.
- Duplicate submissions, timeout retries, and repeated/out-of-order webhooks
  do not create duplicate holds, debits, orders, or refunds.
- Definitive initialization failure and expiry release holds safely; client
  cancellation alone does not. Successful payment during cancellation settles
  correctly. Late success after release follows the documented exception policy.
- Reject invalid contribution amounts, stale quotes, unauthorized intent access,
  and mismatched webhook currency/amount/reference without corrupting balances.
- Publish migrations, reservation/status schemas, provider reconciliation rules,
  and frontend integration steps before enabling the split option in the app.

## Chat

| Method | Endpoint           | Auth                | Purpose                                         |
| ------ | ------------------ | ------------------- | ----------------------------------------------- |
| POST   | `/chatbot/query`   | No in current route | AI recommendation restricted to catalog matches |
| GET    | `/chatbot/history` | Yes                 | Read chat history                               |
| DELETE | `/chatbot/history` | Yes                 | Clear chat history                              |

Chat query data contains `recommendation` and `recommended_tests`. Only matched catalog tests should be treated as available tests.

## Remote/admin endpoints

These are operational endpoints and should be protected at the deployment layer as appropriate:

- `GET /remote/get_order/{order_ref}`
- `POST /remote/accept_order`
- `POST /remote/postresult`
- `GET /admin/get_all_orders`
- `GET /admin/get_order_by_id`
- `GET /admin/get_order_by_date`

`POST /remote/postresult` stores the report URL in `order_details.report_file`; that URL appears in `/get_user_result` after upload.
