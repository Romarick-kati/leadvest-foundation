// The whole API (server/src/app.ts) as one Netlify Function. /api/* and /uploads/* are routed
// here by the rules that scripts/netlify-build.mjs writes to client/dist/_redirects.
export { handler } from '../../server/dist/netlify.js';
