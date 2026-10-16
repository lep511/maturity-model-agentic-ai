// Single Vercel Function for the read-only Lens API.
// vercel.json rewrites every /api/* path here; lib/api/router.mjs routes by pathname.
import { handleRequest } from '../lib/api/router.mjs';

export default {
  fetch: handleRequest,
};
