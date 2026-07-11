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
