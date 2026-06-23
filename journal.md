Next:
- In all forms, have option to create new from drop down boxes

6/23/26
- Added "Settings" option to the account menu with a change password feature (verifies current password before updating)
- Added a Profile page to edit full name (saved to user metadata) and view account email
- Wired up /profile and /settings routes, which were previously linked but missing

6/18/26
- Added "forgot password via email" feature using Supabase Auth
- Added "Forgot password?" link on login page, plus new Forgot Password and Reset Password pages
- Fixed password reset link redirecting to the wrong URL by respecting the Vite base path
- Fixed reset link landing on the dashboard instead of the reset page by setting the router basename

3/18/26:
- Fixed local time bug
- Completing maintenance tasks now creates a new service record
- Links in top breadcrumbs navigation bar now works
- Added "service type" to maintenance tasks
- Fixed failure to query asset name in Service Records table
- Added DataTable component (TanStack Table) to enable column filters to Service Records Table

3/17/26
- Added option to make maintenance tasks re-occuring.

3/16/26
- Fixed issue with Units not editable after creation. Removed "Occupied" field in the "Units" table and replaced with "description" and "Notes" instead.
- moved SQL migrations and schema into same repository as the front end
