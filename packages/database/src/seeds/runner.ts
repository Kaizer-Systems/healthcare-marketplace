// Seed runner entrypoint.
// TODO (Phase A0): implement per DATA_MODELS.md section 19 — ordered seed files
// with FK-aware insertion and an `--accounts-only` switch that loads only the
// developer account seeds (used by `pnpm db:seed:accounts`).

const MODE = process.argv.includes('--accounts-only') ? 'accounts' : 'all';

async function main(): Promise<void> {
  console.log(`[seeds] runner placeholder — mode=${MODE}`);
}

main().catch((err) => {
  console.error('[seeds] runner failed:', err);
  process.exit(1);
});
