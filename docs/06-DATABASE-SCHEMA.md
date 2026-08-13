# 06 — Database Schema (PostgreSQL 16 + pgvector, Drizzle ORM)

Conventions: UUIDv7 PKs (app-generated), `snake_case`, `timestamptz` everywhere, `created_at`/`updated_at` on every table, soft delete only where noted, FKs `on delete cascade` from user/account roots (GDPR purge). Enums as Postgres enums via Drizzle. JSONB payloads validated by zod in `packages/contracts` before write.

## users
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| email | text unique nullable | asked in onboarding if X doesn't provide |
| name | text | |
| timezone | text | IANA, default 'UTC' |
| onboarding_step | enum(`consent,analyzing,voice,goals,plan,first_draft,done`) | resume point |
| preferences | jsonb | cadence, posting windows, goal |
| status | enum(`active,suspended,deleted`) | |
| deleted_at | timestamptz nullable | soft delete → purge job |

## x_accounts
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK users | idx |
| x_user_id | text unique | X's id |
| handle, display_name, avatar_url | text | cached profile |
| access_token_enc, refresh_token_enc | bytea | AES-256-GCM |
| token_expires_at | timestamptz | |
| scopes | text[] | |
| connection_status | enum(`connected,token_expired,revoked,rate_limited`) | |
| last_ingested_post_id | text nullable | ingestion watermark |
| is_primary | boolean | MVP UI uses the primary |

## ingested_posts
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| x_account_id | uuid FK | idx |
| x_post_id | text | unique(x_account_id, x_post_id) |
| type | enum(`post,reply,quote`) | |
| text | text | |
| posted_at | timestamptz | idx desc |
| metrics_at_ingest | jsonb | likes, impressions, etc. |
| embedding | vector(1536) | HNSW index, cosine |

## voice_profiles
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| x_account_id | uuid FK | idx |
| version | int | unique(x_account_id, version) |
| traits | jsonb | zod-validated VoiceTraits |
| topics | jsonb | |
| sample_sentences | jsonb | |
| source | enum(`analysis,user_edit,refinement`) | |
| is_active | boolean | partial unique idx: one active per account |

## memory_facts
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | idx |
| category | enum(`project,audience,expertise,goal,opinion,preference`) | |
| content | text | |
| confidence | real | 0–1 |
| source | enum(`extracted,user_provided`) | |
| status | enum(`active,archived`) | |
| source_post_ids | uuid[] nullable | provenance |

## content_plans
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| x_account_id | uuid FK | unique(x_account_id, week_start) |
| week_start | date | ISO Monday |
| status | enum(`draft,active,completed`) | |
| rationale | text | AI's summary of the week's strategy |

## plan_slots
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| content_plan_id | uuid FK | idx |
| topic | text | |
| format | enum(`single,thread`) | |
| angle | text | why this post |
| target_at | timestamptz | idx |
| status | enum(`empty,drafting,ready,approved,published,skipped`) | |
| position | int | ordering within week |

## drafts
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| x_account_id | uuid FK | idx |
| plan_slot_id | uuid FK nullable | ad-hoc drafts allowed |
| status | enum(`generating,needs_review,approved,rejected,archived,failed`) | idx |
| current_version_id | uuid FK draft_versions nullable | |

## draft_versions
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| draft_id | uuid FK | idx |
| version | int | unique(draft_id, version) |
| content | jsonb | ordered tweet segments [{text, media_refs}] |
| author | enum(`ai,user`) | |
| ai_generation_id | uuid FK nullable | provenance |

## scheduled_posts
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| draft_id | uuid FK unique | 1:1 with approved draft |
| x_account_id | uuid FK | idx |
| publish_at | timestamptz | idx |
| idempotency_key | uuid unique | publish exactly-once guard |
| status | enum(`scheduled,publishing,published,failed,canceled`) | idx |
| x_post_ids | text[] nullable | thread = many |
| failure_reason | text nullable | user-readable |
| trigger_run_id | text nullable | Trigger.dev handle for cancel |

## post_metrics
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| scheduled_post_id | uuid FK | idx |
| captured_at | timestamptz | snapshot time |
| window | enum(`h24,d7`) | unique(scheduled_post_id, window) |
| impressions, likes, replies, reposts, bookmarks, profile_clicks | int | |

## learning_signals
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| x_account_id | uuid FK | idx |
| draft_id | uuid FK nullable | |
| type | enum(`edit_diff,rejection,regeneration_note,rating,performance`) | |
| payload | jsonb | e.g. {ai_text, user_text} |
| processed | boolean | consumed by refinement job |

## insights
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| x_account_id | uuid FK | idx |
| kind | text | e.g. 'format_performance' |
| summary | text | user-facing sentence |
| evidence | jsonb | |
| status | enum(`active,dismissed`) | |

## push_subscriptions
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | idx; cascades on account deletion |
| endpoint | text | **unique** — one row per device, not per user |
| p256dh | text | client public key from the browser subscription |
| auth | text | client auth secret from the browser subscription |
| created_at | timestamptz | |

Delivery is Web Push only (D31). A row is removed when the push service reports the endpoint gone (404/410); a transient send failure leaves it alone. Notification content is not persisted — it is derived at send time from the plan or draft in question, so nothing user-facing is duplicated into a queue table.

`notifications` / `notification_preferences` from the original design are **not built**. Per-type preferences and quiet hours are Phase 2; today the only control is on/off per device.

## plans / subscriptions / usage_records / payment_events (billing-ready, dormant in MVP, provider-agnostic)
`plans`: id, code unique(`free_beta,pro,team`), name, limits jsonb, price_cents, currency (default 'NGN'-ready, per-plan), active.
`subscriptions`: id, user_id FK unique, plan_code enum(`trial,free_beta,pro,team`), status enum(`trialing,active,expired,canceled,past_due`), trial_ends_at timestamptz nullable, payment_provider enum(`paystack,flutterwave,stripe,lemonsqueezy`) nullable, provider_customer_id text nullable, provider_subscription_id text nullable, current_period_start/end. No provider-named columns — switching providers is a data migration, not a schema migration. Defaults are `free_beta`/`active`, not `trial`: the application sets trial explicitly at signup so an unexpected row is never silently a countdown (D30).
`usage_records`: id, user_id FK, metric enum(`draft_generated,plan_generated,post_published`), quantity, period text, unique(user_id, metric, period) with counter update. Period is a month bucket (`"2026-08"`) for paid plans and the literal `"trial"` for trials, so trial allowances run for the life of the trial rather than resetting at a month boundary (D30).
`payment_events`: id, payment_provider enum, provider_event_id text, unique(payment_provider, provider_event_id) — webhook idempotency ledger; type enum(`subscription_activated,payment_succeeded,payment_failed,subscription_canceled`), subscription_id FK nullable, payload jsonb (raw, for audit), processed_at.

## ai_generations
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | idx |
| purpose | enum(`voice_analysis,memory_extraction,plan,draft,refinement`) | |
| provider, model | text | |
| input_tokens, output_tokens | int | |
| cost_usd | numeric(10,6) | |
| latency_ms | int | |
| status | enum(`ok,error`) | + error detail |

## Indexing & ops notes
- Hot paths: `drafts(x_account_id, status)`, `scheduled_posts(status, publish_at)` (publisher scan), `plan_slots(content_plan_id, position)`, `ingested_posts` HNSW on embedding.
- Migrations: `drizzle-kit generate` committed to `packages/db/migrations`, applied via release step; never `db push` outside local dev.
- Retention: `ai_generations` and `notifications` pruned at 12 months; `ingested_posts` purged on revocation/deletion.
- Backups: daily snapshot + WAL/PITR in production.
