// Isolated online visual preview: no database or outbound API calls.
module.exports = function isolatedPreviewApi(req, res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Vacancy-Preview-Isolated','api-disabled');
  return res.status(403).json({error:'Isolated synthetic preview: all API actions disabled'});
};
