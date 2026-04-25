# GitHub Environments — One-Time Setup

This repository's deploy workflows bind to GitHub Environments via the
`environment-name` / `environment-url` inputs on `reusable-deploy.yml`. Two
environments are referenced:

| Environment  | Bound by                | Required reviewers | Allowed branches |
| ------------ | ----------------------- | ------------------ | ---------------- |
| `staging`    | `deploy-staging.yml`    | _none_ (auto)      | `staging` only   |
| `production` | `deploy-production.yml` | **required**       | `main` only      |

GitHub auto-creates an environment on first reference, but **protection rules
are NOT auto-applied**. The `production` gate exists only after a repo admin
configures it in the UI. Until then, prod deploys would run unattended — which
is unacceptable for a healthcare-grade workload. Do this once.

## Create the `production` environment

1. Open the repo on GitHub → **Settings → Environments → New environment**.
2. Name: `production` (exact case).
3. Configure protection rules:
   - **Required reviewers**: add yourself (and any future deploy approvers).
     Each listed reviewer must approve before the deploy job runs.
   - **Wait timer** (optional): e.g. 5 minutes, to allow last-minute cancel.
   - **Deployment branches**: choose **Selected branches** → add a rule for
     `main` only. This rejects deploys triggered from any other ref.
4. (Optional) Add **Environment secrets** if production needs values that
   should not exist for staging. Workflow secrets resolve in this order:
   environment secret → repo secret → org secret.
5. Save.

## Create the `staging` environment

Optional but recommended for visibility in the GitHub Environments view.

1. **Settings → Environments → New environment** → name `staging`.
2. Leave protection rules empty (no reviewers, no wait timer).
3. Set **Deployment branches** → **Selected branches** → `staging` only.
4. Save.

## Verifying the gate works

After PR #1 merges to `dev` → ... → `main`:

1. The push to `main` triggers `deploy-production.yml`.
2. The `deploy-backend` job appears as **Waiting** on the run page with
   _"This job is waiting for review"_.
3. An approver opens the run, clicks **Review deployments**, picks
   `production`, optionally leaves a comment, then **Approve and deploy**.
4. The job runs against the bound URL (`https://api.yourdomain.com`).
5. `deploy-frontend` follows (also gated, since it also binds to
   `production`). The smoke check runs after both succeed.

## Image tag resolution

`deploy-production.yml` picks the image tag in this order:

1. `workflow_dispatch.inputs.image-tag` if provided (manual re-deploy of a
   specific build).
2. The git tag name when triggered by a `v*.*.*` tag push
   (e.g. `v1.4.0`).
3. `github.sha` for a normal push to `main`.

`ci-main.yml` builds and tags images for both `main` and `staging` pushes,
so the `github.sha`-tagged image is always available before the matching
deploy fires.

## Troubleshooting

- **Job stuck on "Waiting"** — no reviewer is listed on the `production`
  environment. Add yourself as a required reviewer.
- **"Branch not allowed to deploy to environment"** — the deploy was
  triggered from a branch other than `main`. This is the gate working
  correctly. Trigger from `main` or use `workflow_dispatch` from `main`.
- **Manual `workflow_dispatch` not visible** — `workflow_dispatch` is
  only available for the workflow file as it exists on the repository's
  default branch (`main`). Until the workflow lands on `main`, the
  dropdown will be empty for that workflow.
