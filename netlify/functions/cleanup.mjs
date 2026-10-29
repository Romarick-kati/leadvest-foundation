// Hourly removal of expired sessions and tokens (schedule set in netlify.toml).
export { cleanupHandler as handler } from '../../server/dist/netlify.js';
