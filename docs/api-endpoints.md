# API Endpoints

Base URL for direct local access:

```txt
http://localhost:3001
```

Notes:

- The Nest app does not currently use a global `/api` prefix.
- All protected endpoints use `Authorization: Bearer <jwt_access_token>`.
- All company-scoped requests validate that the authenticated user is an active member of the target company.
- `users` is the only module that does not use `company_id`.

## Company-scoped rules

For all business modules (`company-memberships`, `teams`, `gardens`, `tasks`, `worklogs`, `products`, `stock-rules`, `product-usage`, `payments`, `quotes`):

- `GET` list endpoints accept `company_id` in the query string.
- `GET` detail endpoints accept `company_id` in the query string.
- `POST` and `PATCH` require `company_id` in the JSON body.
- Responses include `company_id`.
- `DELETE` infers the company from the target resource and still validates permissions.

## Authentication

### `POST /auth/login`

Request:

```json
{
  "email": "miguellbwork@gmail.com",
  "password": "Nodeapp2107."
}
```

Response `200`:

```json
{
  "accessToken": "<jwt_access_token>",
  "user": {
    "id": "uuid",
    "name": "Miguel Work",
    "email": "miguellbwork@gmail.com"
  },
  "companies": [
    {
      "id": "uuid",
      "name": "Floripa Jardins",
      "slug": "floripa-jardins",
      "logo_path": "/companies/floripa-jardins.png",
      "favicon_path": "/companies/floripa-jardins-favicon.png",
      "address": "Rua Horta do Palacio- Edf. Palacio Apart.1007, 8500-512 Portimao",
      "nif": "233125825",
      "mobile_phone": "965403815",
      "email": "talesbrandao@hotmail.com",
      "iban": "PT 50 0007 02 87 302 5220 0028 0",
      "role": "employee"
    }
  ]
}
```

Notes:

- Sets `refresh_token` as `HttpOnly` cookie.
- Only companies where the user has an active company membership are returned.

### `POST /auth/refresh`

Request:

```txt
Cookie: refresh_token=<jwt_refresh_token>
```

Response `200`:

```json
{
  "accessToken": "<jwt_access_token>"
}
```

### `POST /auth/logout`

Response `200`:

```json
{
  "success": true
}
```

### `GET /auth/me`

Response `200`:

```json
{
  "user": {
    "id": "uuid",
    "name": "Miguel Work",
    "email": "miguellbwork@gmail.com"
  },
  "companies": [
    {
      "id": "uuid",
      "name": "Floripa Jardins",
      "slug": "floripa-jardins",
      "logo_path": "/companies/floripa-jardins.png",
      "favicon_path": "/companies/floripa-jardins-favicon.png",
      "address": "Rua Horta do Palacio- Edf. Palacio Apart.1007, 8500-512 Portimao",
      "nif": "233125825",
      "mobile_phone": "965403815",
      "email": "talesbrandao@hotmail.com",
      "iban": "PT 50 0007 02 87 302 5220 0028 0",
      "role": "employee"
    }
  ]
}
```

## Users

`users` is the exception and is not company-scoped.

### `PATCH /users/me`

Request:

```json
{
  "name": "Miguel Work",
  "password": "Nodeapp2107."
}
```

Response `200`:

```json
{
  "user": {
    "id": "uuid",
    "name": "Miguel Work",
    "email": "miguellbwork@gmail.com"
  }
}
```

Notes:

- `name` updates all company memberships linked to the authenticated user.
- `password` updates the auth account password.

## Company Memberships

Access rules:

- `admin`: can create, update, and delete company memberships in accessible companies.
- `employee`: cannot create or delete. Can update only their own `name` and `phone`.
- `employee` receives a public view for other members in the same company.

### `GET /company-memberships?company_id=<uuid>`

Response `200`:

```json
[
  {
    "id": "uuid",
    "company_id": "uuid",
    "user_id": "uuid",
    "email": "miguellbwork@gmail.com",
    "role": "employee",
    "name": "Miguel Work",
    "phone": "912345678",
    "active": true,
    "team_ids": ["uuid"],
    "created_at": "2026-03-15T10:00:00.000Z"
  }
]
```

### `POST /company-memberships`

Request:

```json
{
  "company_id": "uuid",
  "email": "miguellbwork@gmail.com",
  "password": "Nodeapp2107.",
  "role": "employee",
  "name": "Miguel Work",
  "phone": "912345678",
  "team_ids": ["uuid", "uuid"],
  "active": true
}
```

### `GET /company-memberships/:id?company_id=<uuid>`

### `PATCH /company-memberships/:id`

Request:

```json
{
  "company_id": "uuid",
  "role": "admin",
  "phone": "919999999",
  "active": false
}
```

### `DELETE /company-memberships/:id`

Response `204`

## Teams

Access rules:

- `admin`: can create, update, and delete teams.
- `employee`: read-only inside accessible companies.

### `GET /teams?company_id=<uuid>`

### `POST /teams`

```json
{
  "company_id": "uuid",
  "name": "Team A"
}
```

### `GET /teams/:id?company_id=<uuid>`

### `PATCH /teams/:id`

```json
{
  "company_id": "uuid",
  "name": "Team A - Updated"
}
```

### `DELETE /teams/:id`

Response `204`

## Gardens

Access rules:

- `admin`: full CRUD in accessible companies.
- `employee`: read-only.
- `employee` only sees gardens reachable from their team assignments and tasks.
- `employee` response omits `monthly_price`, `start_date`, and `billing_day`.

### `GET /gardens?company_id=<uuid>`

### `POST /gardens`

```json
{
  "company_id": "uuid",
  "client_name": "Joao Silva",
  "address": "Rua A, Porto",
  "phone": "912345678",
  "monthly_price": 120,
  "maintenance_frequency": "weekly",
  "start_date": "2026-03-01",
  "billing_day": 5,
  "status": "active",
  "notes": "Cliente premium"
}
```

### `GET /gardens/:id?company_id=<uuid>`

### `PATCH /gardens/:id`

```json
{
  "company_id": "uuid",
  "status": "paused",
  "notes": "Pausado por 1 mes"
}
```

### `DELETE /gardens/:id`

Response `204`

## Tasks

Access rules:

- `admin`: full CRUD in accessible companies.
- `employee`: read-only and only sees tasks for visible teams in that company.

Allowed `task_type`:

- `maintenance`
- `pruning`
- `cleaning`
- `installation`
- `inspection`
- `emergency`

### `GET /tasks?company_id=<uuid>&garden_id=<uuid>&team_id=<uuid>&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

### `POST /tasks`

```json
{
  "company_id": "uuid",
  "garden_id": "uuid",
  "team_id": "uuid",
  "date": "2026-03-14",
  "start_time": "08:00:00",
  "end_time": "11:00:00",
  "task_type": "maintenance",
  "description": "Levar fertilizante"
}
```

### `GET /tasks/:id?company_id=<uuid>`

### `PATCH /tasks/:id`

```json
{
  "company_id": "uuid",
  "start_time": "09:00:00",
  "description": "Atraso por chuva"
}
```

### `DELETE /tasks/:id`

Response `204`

## Work Logs

Access rules:

- `admin`: can create, update, delete, and list all company work logs.
- `employee`: can create/read/update work logs only for teams they belong to in the target company.
- `employee`: cannot delete work logs.

### `GET /worklogs?company_id=<uuid>&task_id=<uuid>&team_id=<uuid>&garden_id=<uuid>&start_from=<iso>&start_to=<iso>`

### `POST /worklogs`

```json
{
  "company_id": "uuid",
  "task_id": "uuid",
  "team_id": "uuid",
  "start_time": "2026-03-14T08:00:00.000Z",
  "end_time": "2026-03-14T10:30:00.000Z",
  "description": "Concluido sem incidentes"
}
```

Notes:

- `task_id` must belong to the same `company_id`.
- `team_id` must match the task team.

### `GET /worklogs/:id?company_id=<uuid>`

### `PATCH /worklogs/:id`

```json
{
  "company_id": "uuid",
  "end_time": "2026-03-14T11:00:00.000Z",
  "description": "Finalizado com atraso"
}
```

### `DELETE /worklogs/:id`

Response `204`

## Products

Access rules:

- `admin`: full CRUD in accessible companies.
- `employee`: read-only in accessible companies.

Allowed `unit`:

- `unit`
- `kg`
- `g`
- `l`
- `ml`
- `m`
- `m2`
- `m3`
- `pack`

### `GET /products?company_id=<uuid>&search=<term>`

### `POST /products`

```json
{
  "company_id": "uuid",
  "name": "Fertilizante X",
  "unit": "kg",
  "stock_quantity": 25,
  "unit_price": 12.5
}
```

### `GET /products/:id?company_id=<uuid>`

### `PATCH /products/:id`

```json
{
  "company_id": "uuid",
  "stock_quantity": 18,
  "unit_price": 14
}
```

### `DELETE /products/:id`

Response `204`

## Stock Rules

Access rules:

- `admin` only.
- The admin must still be an active company member of the target company.

### `GET /stock-rules?company_id=<uuid>&product_id=<uuid>`

Response item example:

```json
{
  "id": "uuid",
  "company_id": "uuid",
  "product_id": "uuid",
  "product_name": "Fertilizante X",
  "product_unit": "kg",
  "product_stock_quantity": "3.00",
  "operator": "lt",
  "threshold_quantity": "5.00",
  "emails": ["alertas@floripa.pt", "stock@floripa.pt"],
  "created_at": "2026-03-15T10:00:00.000Z"
}
```

### `GET /stock-rules/:id?company_id=<uuid>`

### `POST /stock-rules`

```json
{
  "company_id": "uuid",
  "product_id": "uuid",
  "operator": "lt",
  "threshold_quantity": 5,
  "emails": ["alertas@floripa.pt", "stock@floripa.pt"]
}
```

### `PATCH /stock-rules/:id`

```json
{
  "company_id": "uuid",
  "operator": "lte",
  "threshold_quantity": 7,
  "emails": ["alertas@floripa.pt"]
}
```

### `DELETE /stock-rules/:id`

Response `204`

## Product Usage

Access rules:

- `admin`: full CRUD in accessible companies.
- `employee`: can create usage for their own accessible gardens and for tasks assigned to their teams.
- `employee`: can view their own usage logs and task-linked usage logs for tasks assigned to their teams.
- `employee`: can update only their own usage logs in the target company.
- `employee`: cannot delete usage logs.
- Product stock is adjusted automatically on create, update, and delete.

### `GET /product-usage?company_id=<uuid>&product_id=<uuid>&garden_id=<uuid>&task_id=<uuid>&company_membership_id=<uuid>&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

### `POST /product-usage`

Admin request:

```json
{
  "company_id": "uuid",
  "product_id": "uuid",
  "garden_id": "uuid",
  "task_id": "uuid",
  "quantity": 2.5,
  "date": "2026-03-14",
  "notes": "Aplicacao semanal"
}
```

Employee request:

```json
{
  "company_id": "uuid",
  "product_id": "uuid",
  "garden_id": "uuid",
  "task_id": "uuid",
  "quantity": 2.5,
  "date": "2026-03-14",
  "notes": "Aplicacao semanal"
}
```

Notes:

- `company_membership_id` is optional for admin create. If omitted, the requester's own company membership is used.
- `company_membership_id` must not be sent by employees on create/update.
- If `task_id` is sent, the task must belong to the same `company_id`.
- If `task_id` is sent, `garden_id` must match the task garden.

### `GET /product-usage/:id?company_id=<uuid>`

### `PATCH /product-usage/:id`

```json
{
  "company_id": "uuid",
  "quantity": 3.5,
  "notes": "Aplicacao reforcada"
}
```

### `DELETE /product-usage/:id`

Response `204`

## Expenses

Access rules:

- `admin` only.
- The admin must still be an active company member of the target company.

### `GET /expenses?company_id=<uuid>&garden_id=<uuid>&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

### `GET /expenses/:id?company_id=<uuid>`

### `POST /expenses`

```json
{
  "company_id": "uuid",
  "garden_id": "uuid",
  "category": "fuel",
  "description": "Abastecimento para a deslocacao da equipa",
  "amount": 45.5,
  "date": "2026-03-16"
}
```

### `PATCH /expenses/:id`

```json
{
  "company_id": "uuid",
  "category": "transport",
  "description": "Deslocacao extraordinaria",
  "amount": 52.75,
  "date": "2026-03-16"
}
```

### `DELETE /expenses/:id`

Response `204`

## Payments

Access rules:

- `admin` only.
- The admin must still be an active company member of the target company.

### `GET /payments?company_id=<uuid>`

### `GET /payments/:id?company_id=<uuid>`

### `POST /payments`

```json
{
  "company_id": "uuid",
  "garden_id": "uuid",
  "month": 3,
  "year": 2026,
  "amount": 120,
  "paid_at": "2026-03-10T12:00:00.000Z",
  "notes": "Pago por transferencia"
}
```

### `PATCH /payments/:id`

```json
{
  "company_id": "uuid",
  "amount": 90,
  "notes": "Pagamento parcial"
}
```

### `DELETE /payments/:id`

Response `204`

## Quotes

Access rules:

- `admin` only.
- The admin must still be an active company member of the target company.

### `GET /quotes?company_id=<uuid>`

Response item example:

```json
{
  "id": "uuid",
  "company_id": "uuid",
  "garden_id": "uuid",
  "garden_client_name": "Garcias - Delegacao Algoz",
  "garden_address": "Rua B, Braga",
  "services": [
    "Limpeza das ervas com rocadora",
    "Aplicacao de herbicidas nas ervas",
    "Podas de arvores e arbustos"
  ],
  "price": "240.00",
  "valid_until": "2026-04-15",
  "created_at": "2026-03-15T10:00:00.000Z"
}
```

### `GET /quotes/:id?company_id=<uuid>`

### `POST /quotes`

```json
{
  "company_id": "uuid",
  "garden_id": "uuid",
  "services": [
    "Limpeza das ervas com rocadora",
    "Aplicacao de herbicidas nas ervas"
  ],
  "price": 240,
  "valid_until": "2026-04-15"
}
```

### `PATCH /quotes/:id`

```json
{
  "company_id": "uuid",
  "services": [
    "Limpeza das ervas com rocadora",
    "Aplicacao de herbicidas nas ervas",
    "Podas de arvores e arbustos"
  ],
  "price": 260,
  "valid_until": "2026-04-30"
}
```

### `DELETE /quotes/:id`

Response `204`
