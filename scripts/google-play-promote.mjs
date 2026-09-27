#!/usr/bin/env node
// Promotes an already-uploaded Google Play release to another track by version code,
// via the Play Developer API — no rebuild or re-upload of the app bundle involved.
// Usage: google-play-promote.mjs --package <id> --to <track> --version-code <n>
// Requires GOOGLE_PLAY_SERVICE_ACCOUNT_JSON in the environment.

import { createSign } from 'node:crypto';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    out[args[i].replace(/^--/, '')] = args[i + 1];
  }
  return out;
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getAccessToken({ client_email, private_key }) {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const claim = base64url(
    JSON.stringify({
      iss: client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }),
  );
  const signInput = `${header}.${claim}`;
  const signature = createSign('RSA-SHA256')
    .update(signInput)
    .sign(private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const jwt = `${signInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to obtain access token: ${res.status} ${await res.text()}`);
  }
  const { access_token } = await res.json();
  return access_token;
}

async function main() {
  const { package: packageName, to, 'version-code': versionCode } = parseArgs();
  if (!packageName || !to || !versionCode) {
    console.error('Usage: google-play-promote.mjs --package <id> --to <track> --version-code <n>');
    process.exit(1);
  }

  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not set');
  const accessToken = await getAccessToken(JSON.parse(raw));

  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits`;
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const editRes = await fetch(base, { method: 'POST', headers });
  if (!editRes.ok) throw new Error(`Failed to create edit: ${editRes.status} ${await editRes.text()}`);
  const { id: editId } = await editRes.json();

  const trackRes = await fetch(`${base}/${editId}/tracks/${to}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      track: to,
      releases: [{ versionCodes: [String(versionCode)], status: 'completed' }],
    }),
  });
  if (!trackRes.ok) {
    throw new Error(`Failed to update track "${to}": ${trackRes.status} ${await trackRes.text()}`);
  }

  const commitRes = await fetch(`${base}/${editId}:commit`, { method: 'POST', headers });
  if (!commitRes.ok) {
    throw new Error(`Failed to commit edit: ${commitRes.status} ${await commitRes.text()}`);
  }

  console.log(`Promoted versionCode ${versionCode} to "${to}" for ${packageName}.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
