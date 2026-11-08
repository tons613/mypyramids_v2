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
{ "amount": 5000 }
```

It returns the same payment initialization response. The server stores the wallet intent before checkout.

### Paystack webhook

`POST /verify_transactions` is called by Paystack, not by the client. It requires the `X-Paystack-Signature` header calculated over the exact raw body with the Paystack secret. For `charge.success`, the server matches the reference and amount to its stored payment intent. It then confirms the order or credits the wallet. Client metadata is not used for identity, prices, or totals. Repeated delivery of a paid reference is acknowledged without a second credit.

## Virtual card wallet

| Method | Endpoint                 | Auth | Purpose                                |
| ------ | ------------------------ | ---- | -------------------------------------- |
| POST   | `/vcard/activate`        | Yes  | Create or return the user's wallet     |
| GET    | `/vcard/get_card_detail` | Yes  | Return balance and transaction history |

`data.transactions` is newest first and contains transaction ID, amount, description, type, and creation time. Internal IDs and payment references are not exposed.

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
