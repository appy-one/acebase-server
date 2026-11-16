# Thunder Client — AceBase Server API Collection

This directory contains an importable collection of all available `acebase-server` API endpoints and an environment file that pre-configures the `dbname` and `access_token` for each request.

## Files

| File | Description |
|------|-------------|
| `collection.json` | All API endpoints, organized by category |
| `environment.json` | Environment variables (`dbname`, `access_token`, `host`) |

## How to import

1. Open [Thunder Client](https://www.thunderclient.com/) in VS Code (install it from the Extensions marketplace if needed).
2. In the Thunder Client sidebar, click the **Collections** tab.
3. Click the menu icon (⋮) next to "Collections" and choose **Import**.
4. Select `collection.json` from this directory.
5. Switch to the **Env** tab in the sidebar, click the menu icon and choose **Import**.
6. Select `environment.json` from this directory.
7. Make the imported environment active by clicking it and selecting **Set Active**.

## Configuration

Edit the active environment to match your local setup:

| Variable | Description | Default |
|----------|-------------|---------|
| `host` | Base URL of your AceBase server | `http://localhost:3000` |
| `dbname` | Name of the database | `default` |
| `access_token` | Bearer token for authenticated requests | _(empty)_ |

To get an `access_token`, run the **Sign in** request first — the response includes a token you can copy into the environment.
