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

## Client payment rule

After opening Paystack checkout, show payment as pending. Refresh the relevant order or wallet endpoint after the webhook has confirmed the payment. Do not infer success from a redirect alone and do not call the webhook from the client.
