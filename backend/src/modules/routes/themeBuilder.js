import { Router } from 'express';
import {
  getThemes,
  getThemeBySlug,
  createTheme,
  saveThemeDraft,
  publishTheme,
  rollbackTheme,
  getThemeVersions,
  getPageLayouts,
  getPageLayoutBySlug,
  createPageLayout,
  savePageLayoutDraft,
  publishPageLayout,
  getActiveConfig,
} from '../controllers/themeController.js';

const router = Router();

// Theme routes
router.get('/themes', getThemes);
router.get('/themes/active', getActiveConfig);
router.get('/themes/:slug', getThemeBySlug);
router.post('/themes', createTheme);
router.patch('/themes/:slug/draft', saveThemeDraft);
router.patch('/themes/:slug/publish', publishTheme);
router.post('/themes/:slug/rollback', rollbackTheme);
router.get('/themes/:slug/versions', getThemeVersions);

// Page layout routes
router.get('/layouts', getPageLayouts);
router.get('/layouts/:slug', getPageLayoutBySlug);
router.post('/layouts', createPageLayout);
router.patch('/layouts/:slug/draft', savePageLayoutDraft);
router.patch('/layouts/:slug/publish', publishPageLayout);

export default router;
