# Release infrastructure

How Oriel ships releases, why the setup is shaped the way it is, and how to recreate or rotate it. Read this before touching `.github/workflows/release-please.yml` or anything in the release-build chain.

## Why a GitHub App (and not GITHUB_TOKEN or a PAT)

`release-please` opens the release PR, merges create a tag, and the tag fires a `release: published` event. We want that event to trigger `release-build.yml` so dist artifacts get attached automatically.

GitHub **intentionally suppresses downstream workflow triggers from events that originated via `GITHUB_TOKEN`**. This is a documented anti-loop guarantee — it prevents an action from triggering itself and burning CI minutes in a runaway loop. The consequence for us: when `release-please` runs under the default `GITHUB_TOKEN` and creates a release, `release-build.yml` does NOT fire. v4.6.0 and v4.7.0 both needed a manual `gh workflow run release-build.yml` dispatch as a result.

The fix is to make `release-please` run under a token whose actor isn't `github-actions[bot]`, so the resulting `release: published` event isn't suppressed. Options:

| Option | Why we didn't pick it |
|---|---|
| **PAT (personal access token)** | Tied to a human account, broader default scope, rotation falls on that person, leaves the org if the human leaves. |
| **`workflow_dispatch` glue** | Works but obscures intent and doesn't generalize. Hides the fact that release-please's output isn't a "real" release event. Future maintainers would re-discover the suppression rule. |
| **GitHub App** ✅ | Tightest scope, repo-only install, machine identity that survives team changes, GitHub's documented recommendation for this exact case. |

We use **a small private GitHub App named `oriel-release-bot`**, installed only on `TheDave94/oriel-dashboard`. The App's only job is minting short-lived tokens for `release-please`. Nothing else uses it.

## One-time setup (manual — needs hands on the GitHub UI)

Recreate the App when:
- Bootstrapping a fork of this repo
- Rotating the App's private key
- Replacing the App entirely (e.g. after a security incident)

Steps:

1. **Open the GitHub Apps settings.** GitHub avatar → **Settings → Developer settings → GitHub Apps → New GitHub App**.
2. **Name**: `oriel-release-bot` (or any globally-unique name). The bot identity that authors release-PR commits will be `<name>[bot]`.
3. **Homepage URL**: the repo URL — `https://github.com/TheDave94/oriel-dashboard`.
4. **Webhook**: **disabled**. We use the App only for token exchange; we don't need event delivery.
5. **Repository permissions** (every one matters — set exactly these, nothing more):

   | Permission | Level | Why |
   |---|---|---|
   | Contents | **Read and write** | Create tags, create releases, push the release-please version-bump commit |
   | Pull requests | **Read and write** | Open + maintain the release PR |
   | Actions | **Read and write** | The new release-build trigger (the whole point of the App) |
   | Metadata | Read | Always required, automatic |
   | _Everything else_ | **No access** | Minimum-blast-radius principle |

6. **Where can this GitHub App be installed**: **Only on this account**. Not org-wide.
7. **Create the App.** Note the **App ID** displayed on the App's settings page — small integer like `1234567`.
8. **Generate a private key**: scroll to **Private keys** → **Generate a private key**. A `.pem` file downloads to your machine. **Save it securely — it cannot be re-downloaded.** Anyone with this key can mint tokens that act as the App.
9. **Install the App on `TheDave94/oriel-dashboard` only.** Sidebar → **Install App** → pick the account → **Only select repositories** → check `oriel-dashboard`.
10. **Add two repo secrets** to `oriel-dashboard` — Settings → Secrets and variables → Actions → **New repository secret**:

    | Secret name | Value |
    |---|---|
    | `RELEASE_APP_ID` | The App ID integer from step 7. |
    | `RELEASE_APP_PRIVATE_KEY` | Full contents of the `.pem` from step 8, including the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines. |

After step 10, the workflow change in `.github/workflows/release-please.yml` (committed alongside this doc) will pick up the App identity automatically on the next push to `main`.

## How the workflow uses the App

`.github/workflows/release-please.yml` mints a short-lived installation token before invoking release-please:

```yaml
- name: Mint release-bot token
  id: app-token
  uses: actions/create-github-app-token@<pinned SHA>
  with:
    app-id: ${{ secrets.RELEASE_APP_ID }}
    private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}

- name: Release Please
  uses: googleapis/release-please-action@<pinned SHA>
  with:
    token: ${{ steps.app-token.outputs.token }}
    release-type: node
```

The minted token lasts one hour, scoped to the installed repo, with the permissions configured in step 5. release-please uses it to push the version-bump commit + open the PR + (when the PR merges) tag + create the release — every one of those actions now appears to GitHub as initiated by the App, not `GITHUB_TOKEN`, so the downstream `release: published` event fires `release-build.yml` automatically.

## Acceptance test

Next release after this setup ships should land entirely hands-off:

1. Merge any PR with a `feat:` / `fix:` / `feat!:` commit to `main`.
2. Confirm `Release Please` workflow run succeeds. The release PR it opens should show `oriel-release-bot[bot]` as the commit author (not `github-actions[bot]`).
3. Merge the release PR.
4. Confirm:
   - Tag created automatically — already worked under `GITHUB_TOKEN`.
   - **`release-build.yml` auto-fires** from the `release: published` event. This is the regression we're fixing.
   - Dist assets land on the GitHub release without a manual dispatch.
5. Install on live HA via HACS — picks up the new version normally.

If step 4's auto-fire fails, **do not** paper over with a fallback `gh workflow run` step. That masks whether the App approach actually works. Read the CI logs, then see Troubleshooting below.

## Troubleshooting

### Symptom: `actions/create-github-app-token` step fails

Most common causes:

- **App not installed on this repo.** Error mentions `Installation not found` or `404 Not Found` resolving the installation. Fix: go through step 9 of the setup above.
- **`RELEASE_APP_ID` secret missing or wrong type.** Error mentions `id: must be a number` or `app-id is required`. Fix: confirm the secret exists in repo Settings → Secrets → Actions and matches the integer on the App's settings page.
- **`RELEASE_APP_PRIVATE_KEY` malformed.** Error mentions `invalid PEM` or `PKCS#1 format expected`. Fix: re-copy the full `.pem` including the `-----BEGIN` / `-----END` lines and the newlines between them. GitHub secrets preserve newlines if you paste with them.

### Symptom: release-please runs but doesn't open a PR

Most likely the App's **Pull requests** permission is missing or wasn't accepted on install. Re-check the permissions table in step 5; if you change permissions after install, GitHub prompts you to approve the new permissions on the installation — until you approve, the App still has the old permission set.

### Symptom: release created but `release-build.yml` still doesn't fire

This is the failure mode the whole App setup is designed to prevent. If it happens after the App is correctly wired, something material changed:

1. GitHub may have widened the suppression rule to also block App-token-initiated events. Read the [current GitHub Actions docs on event triggering](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow) — if so, an updated mitigation is needed.
2. The workflow file may have lost the App-token step in a refactor. Diff `release-please.yml` against the commit that introduced the App pattern (search the log for `ci(release): use GitHub App token`).

**Do not** add a `workflow_dispatch` fallback as a quick fix. The fallback obscures whether the App approach works at all. Either fix the root cause or open an issue documenting the regression so the next maintainer doesn't inherit a silent workaround.

### Symptom: release PR author is `github-actions[bot]` instead of `oriel-release-bot[bot]`

The App token isn't being used. Check that:
- The workflow has the `Mint release-bot token` step before `Release Please`.
- The release-please step has `token: ${{ steps.app-token.outputs.token }}` set.
- Both secrets resolve (the workflow log shows `***` for both names, not blanks).

## Key rotation

Annually, or after any security incident:

1. Open the App's settings page on GitHub.
2. **Private keys** section → **Generate a private key**. A new `.pem` downloads.
3. **Don't delete the old key yet.** Both keys are valid simultaneously during the rollover.
4. Replace `RELEASE_APP_PRIVATE_KEY` in the repo's Actions secrets with the new `.pem` contents.
5. Trigger a release-please run to confirm the new key works (push any small `chore:` commit to main, or use `gh workflow run release-please.yml`). If the workflow succeeds, the new key is in use.
6. Now go back to the App's settings and **delete the old key**. Two-key window closes.

## Known follow-up: migrate `app-id` → `client-id`

`actions/create-github-app-token` v3.x emits this warning on every
release-please run:

```
Input 'app-id' has been deprecated with message: Use 'client-id' instead.
```

Non-fatal — v3.2.0 still accepts `app-id`. But a future major version
will drop it. To clear:

1. Open the App's settings page on GitHub.
2. The **Client ID** field is on the same page as **App ID** — looks
   like `Iv23li...` rather than the plain integer.
3. Add a new repo secret `RELEASE_APP_CLIENT_ID` with the Client ID
   value. (GitHub Actions secrets can't be renamed, so it's
   add-new-then-delete-old.)
4. In `.github/workflows/release-please.yml`, change:

   ```yaml
   - name: Mint release-bot token
     uses: actions/create-github-app-token@...
     with:
       app-id: ${{ secrets.RELEASE_APP_ID }}
   ```

   to:

   ```yaml
   - name: Mint release-bot token
     uses: actions/create-github-app-token@...
     with:
       client-id: ${{ secrets.RELEASE_APP_CLIENT_ID }}
   ```

5. Confirm a release-please run succeeds without the deprecation
   warning.
6. Delete the old `RELEASE_APP_ID` secret from repo settings.

The Client ID and App ID identify the same App; the migration is
just adopting the newer-recommended input name.

## Out of scope

The release-bot App is for `release-please` only. Don't migrate other workflows to it.

- **Why**: only `release-please` needs the "trigger downstream events from a release" property. Everything else can stay on `GITHUB_TOKEN` — minimum-blast-radius.
- **If a future workflow legitimately needs the same property**: that's a deliberate scope expansion and gets its own PR + a new section in this doc covering why the broader use is justified.

The App also does not:

- Have webhook events enabled (we only use it for token exchange).
- Have any permission beyond the four listed in step 5.
- Get installed on any other repo.

Any change to those defaults is a security-relevant decision that deserves its own PR + rationale.
