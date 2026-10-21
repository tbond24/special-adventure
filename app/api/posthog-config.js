// Public browser configuration only. Never return a personal/admin API key.
function publicConfig(env) {
  // Production is deliberately unsupported until a separately approved change.
  if (env.POSTHOG_ENABLED !== 'true' || !['development', 'preview'].includes(env.VERCEL_ENV)) return {enabled:false};
  const token = env.POSTHOG_PROJECT_TOKEN || '';
  const host = env.POSTHOG_HOST || '';
  if (!/^phc_[A-Za-z0-9_-]{10,200}$/.test(token) ||
      !['https://us.i.posthog.com', 'https://eu.i.posthog.com'].includes(host)) return {enabled:false};
  return {enabled:true, token, host};
}

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({error:'Method not allowed'});
  }
  return res.status(200).json(publicConfig(process.env));
};
module.exports.publicConfig = publicConfig;
