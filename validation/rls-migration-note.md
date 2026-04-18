# RLS Migration Review Note

## Summary

A new Drizzle migration (`drizzle/0003_wooden_snowbird.sql`) was generated after updating the application schema to include the `employee` role in the persisted enum. I reviewed the SQL and **did not apply it verbatim** in the current environment.

## Why it was not applied directly

| Concern | Detail |
| --- | --- |
| Duplicate table creation risk | The generated file also includes `CREATE TABLE` statements for `complianceActions` and `reminderActivities`, which were already introduced into the live environment during earlier compliance workflow work. Applying the file unchanged would risk a failure on existing tables. |
| Mixed migration scope | The file combines the intended enum update with previously established workflow tables, so it is not yet a clean, idempotent role-only migration. |
| Live environment already reflects the access model change operationally | The application-layer role alignment, tests, and the user-reported database RLS rollout indicate the environment has already been moved toward employee-aware access control, even though the generated Drizzle history now needs rebasing or manual reconciliation. |

## Recommended next step

Before applying this migration in production, split or rewrite it into a safe reconciled migration that only performs the missing schema delta, or makes the existing table creation steps idempotent for the current database state.
