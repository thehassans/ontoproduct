import Theme from '../models/Theme.js';
import PageLayout from '../models/PageLayout.js';
import ThemeVersion from '../models/ThemeVersion.js';

const sendSuccess = (res, data, message = 'OK') =>
  res.status(200).json({ success: true, message, data });

const sendError = (res, message, status = 500) =>
  res.status(status).json({ success: false, message });

export const getThemes = async (req, res) => {
  try {
    const { status, scope, countryCode } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (scope) filter.scope = scope;
    if (countryCode) filter.countryCode = countryCode;

    const themes = await Theme.find(filter).sort({ updatedAt: -1 }).lean();
    sendSuccess(res, themes);
  } catch (err) {
    sendError(res, err.message);
  }
};

export const getThemeBySlug = async (req, res) => {
  try {
    const theme = await Theme.findOne({ slug: req.params.slug }).lean();
    if (!theme) return sendError(res, 'Theme not found', 404);
    sendSuccess(res, theme);
  } catch (err) {
    sendError(res, err.message);
  }
};

export const createTheme = async (req, res) => {
  try {
    const { name, slug, description, tokens, scope, countryCode } = req.body;
    const exists = await Theme.findOne({ slug }).lean();
    if (exists) return sendError(res, 'Slug already exists', 409);

    const theme = await Theme.create({
      name,
      slug,
      description: description || '',
      tokens: tokens || [],
      scope: scope || 'global',
      countryCode: countryCode || null,
      meta: { author: req.user?.name || 'system' },
    });
    sendSuccess(res, theme, 'Theme created');
  } catch (err) {
    sendError(res, err.message);
  }
};

export const saveThemeDraft = async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, description, tokens, meta } = req.body;

    const theme = await Theme.findOneAndUpdate(
      { slug },
      {
        $set: {
          name,
          description: description || '',
          tokens: tokens || [],
          status: 'draft',
          'meta.lastModifiedBy': req.user?.name || 'system',
        },
        $inc: { 'meta.version': 0.1 },
      },
      { new: true }
    );

    if (!theme) return sendError(res, 'Theme not found', 404);

    await ThemeVersion.create({
      themeId: theme._id,
      snapshot: theme.toObject(),
      version: Math.floor(theme.meta.version * 10) / 10,
      action: 'saveDraft',
      author: req.user?.name || 'system',
      note: 'Draft save',
    });

    sendSuccess(res, theme, 'Draft saved');
  } catch (err) {
    sendError(res, err.message);
  }
};

export const publishTheme = async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, description, tokens, meta } = req.body;

    const theme = await Theme.findOneAndUpdate(
      { slug },
      {
        $set: {
          name,
          description: description || '',
          tokens: tokens || [],
          status: 'published',
          'meta.lastModifiedBy': req.user?.name || 'system',
        },
        $inc: { 'meta.version': 1 },
      },
      { new: true }
    );

    if (!theme) return sendError(res, 'Theme not found', 404);

    await ThemeVersion.create({
      themeId: theme._id,
      snapshot: theme.toObject(),
      version: theme.meta.version,
      action: 'publish',
      author: req.user?.name || 'system',
      note: req.body.note || 'Published',
    });

    sendSuccess(res, theme, 'Theme published');
  } catch (err) {
    sendError(res, err.message);
  }
};

export const rollbackTheme = async (req, res) => {
  try {
    const { slug } = req.params;
    const { version } = req.body;

    const theme = await Theme.findOne({ slug }).lean();
    if (!theme) return sendError(res, 'Theme not found', 404);

    const snapshot = await ThemeVersion.findOne({
      themeId: theme._id,
      version,
    }).lean();

    if (!snapshot) return sendError(res, 'Version not found', 404);

    const restored = await Theme.findOneAndUpdate(
      { slug },
      {
        $set: {
          ...snapshot.snapshot,
          _id: theme._id,
          slug,
          status: 'draft',
          'meta.lastModifiedBy': req.user?.name || 'system',
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    await ThemeVersion.create({
      themeId: theme._id,
      snapshot: restored.toObject(),
      version: restored.meta.version + 0.1,
      action: 'rollback',
      author: req.user?.name || 'system',
      note: `Rolled back to v${version}`,
    });

    sendSuccess(res, restored, 'Theme rolled back');
  } catch (err) {
    sendError(res, err.message);
  }
};

export const getThemeVersions = async (req, res) => {
  try {
    const theme = await Theme.findOne({ slug: req.params.slug }).lean();
    if (!theme) return sendError(res, 'Theme not found', 404);

    const versions = await ThemeVersion.find({ themeId: theme._id })
      .sort({ createdAt: -1 })
      .lean();
    sendSuccess(res, versions);
  } catch (err) {
    sendError(res, err.message);
  }
};

export const getPageLayouts = async (req, res) => {
  try {
    const { route, status, themeSlug } = req.query;
    const filter = {};
    if (route) filter.route = route;
    if (status) filter.status = status;
    if (themeSlug) filter.themeSlug = themeSlug;

    const layouts = await PageLayout.find(filter).sort({ updatedAt: -1 }).lean();
    sendSuccess(res, layouts);
  } catch (err) {
    sendError(res, err.message);
  }
};

export const getPageLayoutBySlug = async (req, res) => {
  try {
    const layout = await PageLayout.findOne({ slug: req.params.slug }).lean();
    if (!layout) return sendError(res, 'Layout not found', 404);
    sendSuccess(res, layout);
  } catch (err) {
    sendError(res, err.message);
  }
};

export const createPageLayout = async (req, res) => {
  try {
    const { name, slug, route, description, themeSlug, tree } = req.body;
    const exists = await PageLayout.findOne({ slug }).lean();
    if (exists) return sendError(res, 'Slug already exists', 409);

    const layout = await PageLayout.create({
      name,
      slug,
      route,
      description: description || '',
      themeSlug: themeSlug || null,
      tree: tree || [],
      meta: { author: req.user?.name || 'system' },
    });
    sendSuccess(res, layout, 'Layout created');
  } catch (err) {
    sendError(res, err.message);
  }
};

export const savePageLayoutDraft = async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, route, description, themeSlug, tree } = req.body;

    const layout = await PageLayout.findOneAndUpdate(
      { slug },
      {
        $set: {
          name,
          route,
          description: description || '',
          themeSlug: themeSlug || null,
          tree: tree || [],
          status: 'draft',
          'meta.lastModifiedBy': req.user?.name || 'system',
        },
        $inc: { 'meta.version': 0.1 },
      },
      { new: true }
    );

    if (!layout) return sendError(res, 'Layout not found', 404);
    sendSuccess(res, layout, 'Layout draft saved');
  } catch (err) {
    sendError(res, err.message);
  }
};

export const publishPageLayout = async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, route, description, themeSlug, tree } = req.body;

    const layout = await PageLayout.findOneAndUpdate(
      { slug },
      {
        $set: {
          name,
          route,
          description: description || '',
          themeSlug: themeSlug || null,
          tree: tree || [],
          status: 'published',
          'meta.lastModifiedBy': req.user?.name || 'system',
        },
        $inc: { 'meta.version': 1 },
      },
      { new: true }
    );

    if (!layout) return sendError(res, 'Layout not found', 404);
    sendSuccess(res, layout, 'Layout published');
  } catch (err) {
    sendError(res, err.message);
  }
};

export const getActiveConfig = async (req, res) => {
  try {
    const { route, countryCode } = req.query;
    const [theme, layout] = await Promise.all([
      Theme.getPublishedTheme(countryCode),
      route ? PageLayout.getPublishedLayout(route, countryCode) : null,
    ]);
    sendSuccess(res, { theme, layout });
  } catch (err) {
    sendError(res, err.message);
  }
};
