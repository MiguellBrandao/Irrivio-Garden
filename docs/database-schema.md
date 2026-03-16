# Database Schema

## Tenant rules

- `companies` is the tenant table.
- `users` is global and does not have `company_id`.
- Every business table has `company_id`.
- A single auth user can belong to multiple companies through multiple rows in `company_memberships`.

## companies

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `name` | `varchar(255)` | Company name |
| `slug` | `varchar(255)` | Unique slug |
| `logo_path` | `varchar(255)` | Relative path for the company logo, nullable |
| `favicon_path` | `varchar(255)` | Relative path for the company favicon, nullable |
| `address` | `text` | Billing/contact address |
| `nif` | `varchar(50)` | Tax number |
| `mobile_phone` | `varchar(50)` | Mobile phone |
| `email` | `varchar(255)` | Contact email |
| `iban` | `varchar(64)` | Bank account |
| `created_at` | `timestamp` | Creation date |

Indexes:

- Unique index on `slug`

## users

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `email` | `varchar(255)` | Login email |
| `password_hash` | `varchar(255)` | Password hash |
| `created_at` | `timestamp` | Creation date |

## company_memberships

Represents a user membership inside a specific company.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `company_id` | `uuid` | FK -> `companies.id` |
| `user_id` | `uuid` | FK -> `users.id`, nullable |
| `role` | `varchar(50)` | `admin` or `employee` |
| `name` | `varchar(255)` | Member display name |
| `phone` | `varchar(50)` | Phone number, nullable |
| `active` | `boolean` | Membership status |
| `created_at` | `timestamp` | Creation date |

Indexes and constraints:

- Unique index on `("user_id", "company_id")`

## company_membership_teams

| Field | Type | Notes |
| --- | --- | --- |
| `company_id` | `uuid` | FK -> `companies.id` |
| `company_membership_id` | `uuid` | FK -> `company_memberships.id` |
| `team_id` | `uuid` | FK -> `teams.id` |
| `created_at` | `timestamp` | Creation date |

Constraints:

- Composite primary key on `("company_membership_id", "team_id")`

## teams

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `company_id` | `uuid` | FK -> `companies.id` |
| `name` | `varchar(150)` | Team name |
| `created_at` | `timestamp` | Creation date |

## gardens

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `company_id` | `uuid` | FK -> `companies.id` |
| `client_name` | `varchar(255)` | Client name |
| `address` | `text` | Service address |
| `phone` | `varchar(50)` | Contact phone, nullable |
| `monthly_price` | `numeric(10,2)` | Contract value, nullable |
| `maintenance_frequency` | `varchar(50)` | `weekly`, `biweekly`, `monthly`, nullable |
| `start_date` | `date` | Contract start date, nullable |
| `billing_day` | `integer` | Billing day, nullable |
| `status` | `varchar(50)` | Default `active` |
| `notes` | `text` | Internal notes, nullable |
| `created_at` | `timestamp` | Creation date |

## tasks

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `company_id` | `uuid` | FK -> `companies.id` |
| `garden_id` | `uuid` | FK -> `gardens.id` |
| `team_id` | `uuid` | FK -> `teams.id`, nullable |
| `date` | `date` | Scheduled date |
| `start_time` | `time` | Planned start time, nullable |
| `end_time` | `time` | Planned end time, nullable |
| `task_type` | `enum` | `maintenance`, `pruning`, `cleaning`, `installation`, `inspection`, `emergency` |
| `description` | `text` | Notes, nullable |
| `created_at` | `timestamp` | Creation date |

## work_logs

The work log is tied to a task and a team. It does not store `company_membership_id`.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `company_id` | `uuid` | FK -> `companies.id` |
| `task_id` | `uuid` | FK -> `tasks.id` |
| `team_id` | `uuid` | FK -> `teams.id` |
| `start_time` | `timestamp` | Real start time, nullable |
| `end_time` | `timestamp` | Real end time, nullable |
| `notes` | `text` | Internal notes, nullable |
| `created_at` | `timestamp` | Creation date |

## products

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `company_id` | `uuid` | FK -> `companies.id` |
| `name` | `varchar(255)` | Product name |
| `unit` | `enum` | `unit`, `kg`, `g`, `l`, `ml`, `m`, `m2`, `m3`, `pack` |
| `stock_quantity` | `numeric(10,2)` | Default `0` |
| `unit_price` | `numeric(10,2)` | Value per configured unit |
| `created_at` | `timestamp` | Creation date |

## stock_rules

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `company_id` | `uuid` | FK -> `companies.id` |
| `product_id` | `uuid` | FK -> `products.id` |
| `operator` | `enum` | `lt`, `lte`, `eq`, `gt`, `gte` |
| `threshold_quantity` | `numeric(10,2)` | Quantity threshold for the rule |
| `emails` | `text[]` | Notification target emails |
| `created_at` | `timestamp` | Creation date |

## product_usage

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `company_id` | `uuid` | FK -> `companies.id` |
| `product_id` | `uuid` | FK -> `products.id` |
| `garden_id` | `uuid` | FK -> `gardens.id` |
| `task_id` | `uuid` | FK -> `tasks.id`, nullable |
| `company_membership_id` | `uuid` | FK -> `company_memberships.id`, nullable |
| `quantity` | `numeric(10,2)` | Used quantity |
| `date` | `date` | Usage date |
| `notes` | `text` | Notes, nullable |

## payments

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `company_id` | `uuid` | FK -> `companies.id` |
| `garden_id` | `uuid` | FK -> `gardens.id` |
| `month` | `integer` | 1..12 |
| `year` | `integer` | Billing year |
| `amount` | `numeric(10,2)` | Paid amount |
| `paid_at` | `timestamp` | Payment timestamp, nullable |
| `notes` | `text` | Notes, nullable |

## quotes

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `company_id` | `uuid` | FK -> `companies.id` |
| `garden_id` | `uuid` | FK -> `gardens.id` |
| `services` | `text[]` | Array of service lines |
| `price` | `numeric(10,2)` | Proposed price |
| `valid_until` | `date` | Default is one month after creation |
| `created_at` | `timestamp` | Creation date |
