# foundation-workflows

Reusable GitHub Actions workflows shared across EvandroViva's product repos
(chutai, fin-flow, …). Moved out of `foundation` so the workflows have their
own release surface, independent of the design-system package's repo.

## What's here

- `.github/actions/setup-node-pnpm/` — composite action wrapping
  `pnpm/action-setup` + `actions/setup-node` (via `.nvmrc`) +
  `pnpm install --frozen-lockfile`.
- `.github/workflows/product-{ci,deploy,mobile-deploy,mobile-qa-apk}.yml` —
  `workflow_call` reusable workflows, parameterized per product (package
  scope, image name, container prefix, per-env API/web URLs, Android package
  ids, etc).

## Consuming from a product repo

```yaml
jobs:
  ci:
    uses: EvandroViva/foundation-workflows/.github/workflows/product-ci.yml@main
    with:
      package-scope: '@your-scope'
    secrets: inherit
```

Referenced by `@main` (no version pinning yet — revisit if drift/breakage
becomes a problem).

## Version bump (push straight to main)

`product-version-bump.yml` bumps a semver string in one file and pushes the
commit directly to the default branch — no PR, no approval. Inputs: `bump`
(patch/minor/major), `file`, `pattern` (regex with one capture group around
`X.Y.Z`), optional `anchor`, `branch`, `runner`.

Pushing past a "require pull request" ruleset needs a bypass actor. Either set a
`RELEASE_PUSH_TOKEN` secret (PAT/App token of a repo admin) in the caller, or add
the **GitHub Actions** app to the ruleset's bypass list and leave the secret unset
(the job falls back to `GITHUB_TOKEN`). The commit carries `[skip ci]`.

```yaml
on:
  workflow_dispatch:
    inputs:
      bump: { type: choice, options: [patch, minor, major], default: patch }
jobs:
  bump:
    permissions: { contents: write }
    uses: EvandroViva/foundation-workflows/.github/workflows/product-version-bump.yml@main
    with:
      bump: ${{ inputs.bump }}
    secrets: inherit
```
