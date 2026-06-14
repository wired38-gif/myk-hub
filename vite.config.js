/**
 * GoDaddy Node.js PaaS reads allowedHosts from vite.config for edge routing
 * (see host.godaddy.com/paas — "Vite apps supported" / allowed hosts auto-update).
 * Express app does not use Vite; this file exists only for platform hostname allowlist.
 */
module.exports = {
  server: {
    allowedHosts: [
      'myk.ac',
      'www.myk.ac',
      'patemusic.live',
      'www.patemusic.live',
      'ltibyjmichael.com',
      'www.ltibyjmichael.com',
      'designbyjmichael.com',
      'www.designbyjmichael.com',
    ],
  },
  preview: {
    allowedHosts: true,
  },
};
