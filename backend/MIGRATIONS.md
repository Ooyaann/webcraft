# Database Migrations (Alembic)

Schema is defined by the SQLAlchemy models in `app/models.py`. Alembic tracks
versioned changes to that schema in `alembic/versions/`.

Alembic reads the database URL from the app's `DATABASE_URL` (via `app.database`)
and translates the async driver to a sync one automatically, so no extra config
is needed. For PostgreSQL migrations, install a sync driver too:
`pip install psycopg2-binary`.

## Everyday workflow

Run these from the `backend/` directory.

- **Apply all migrations** (create/upgrade schema):
  ```
  alembic upgrade head
  ```
- **Create a new migration after changing models:**
  ```
  alembic revision --autogenerate -m "describe your change"
  ```
  Review the generated file in `alembic/versions/`, then `alembic upgrade head`.
- **Roll back one migration:**
  ```
  alembic downgrade -1
  ```

## Adopting Alembic on an existing database

The app still calls `Base.metadata.create_all` on startup as a safety net, so a
dev database created before Alembic already has all tables but no
`alembic_version` row. To bring it under Alembic control without re-creating
anything, stamp it once:

```
alembic stamp head
```

After that, use the normal `revision` / `upgrade` workflow for future changes.

## Notes

- SQLite has limited `ALTER TABLE` support; migrations run in **batch mode**
  (configured in `alembic/env.py`) so column changes work on SQLite too.
- The old raw `ALTER TABLE` statements in `main.py` startup were removed — use
  migrations instead.
