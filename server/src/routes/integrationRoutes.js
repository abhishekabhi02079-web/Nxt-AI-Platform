const express = require('express');
const { body } = require('express-validator');
const integrationController = require('../controllers/integrationController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// OAuth Callback & Error endpoints (Public callback from provider redirect)
router.get('/oauth/error', integrationController.getOAuthError);
router.get('/oauth/:provider/callback', integrationController.handleOAuthCallback);

// Protected endpoints (Require JWT authentication)
router.use(protect);

// Integration List & Health Status
router.get('/', integrationController.getIntegrations);
router.get('/status', integrationController.getIntegrationsStatus);

// OAuth Initiation
router.get('/oauth/:provider/start', integrationController.startOAuth);

// Manual Credential Setup & Disconnect
router.post(
  '/',
  [body('provider').trim().notEmpty().withMessage('Provider is required')],
  integrationController.saveCredentials
);
router.delete('/:provider', integrationController.disconnectIntegration);

module.exports = router;
