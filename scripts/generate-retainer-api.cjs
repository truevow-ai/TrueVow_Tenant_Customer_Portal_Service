/**
 * generate-retainer-api.cjs
 *
 * Contract verification for the RETAINER API schema.
 *
 * Mode 1: node scripts/generate-retainer-api.cjs
 *         Reads openapi.yaml, computes hash, writes to hash file.
 *         (Types must be updated manually from Pydantic schemas.)
 *
 * Mode 2: node scripts/generate-retainer-api.cjs --check
 *         CI contract-drift check. Exits 1 if openapi.yaml hash changed.
 *
 * npm: npm run generate:retainer-api
 * npm: npm run check:retainer-contract
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const openapiPath = path.join(root, 'lib', 'api', 'retainer', 'openapi.yaml');
const hashPath = path.join(root, 'lib', 'api', 'retainer', 'generated', 'openapi-hash.txt');

const isCheck = process.argv.includes('--check');

const content = fs.readFileSync(openapiPath, 'utf8');
const hash = crypto.createHash('sha256').update(content).digest('hex');

if (isCheck) {
  if (!fs.existsSync(hashPath)) {
    console.error('ERROR: No hash file. Run: npm run generate:retainer-api');
    process.exit(1);
  }
  const stored = fs.readFileSync(hashPath, 'utf8').trim();
  if (hash !== stored) {
    console.error('ERROR: OpenAPI spec has changed. Update schema.ts and run: npm run generate:retainer-api');
    console.error(`  Current:  ${hash.substring(0, 16)}`);
    console.error(`  Stored:   ${stored.substring(0, 16)}`);
    process.exit(1);
  }
  console.log('Contract check passed. OpenAPI spec hash: ' + hash.substring(0, 16));
  process.exit(0);
}

fs.mkdirSync(path.dirname(hashPath), { recursive: true });
fs.writeFileSync(hashPath, hash, 'utf8');
console.log(`Hash stored: ${hash.substring(0, 16)}`);
console.log(`OpenAPI: ${openapiPath}`);
