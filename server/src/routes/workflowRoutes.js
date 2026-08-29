const express = require('express');
const { body } = require('express-validator');
const workflowController = require('../controllers/workflowController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all workflow routes with JWT authentication
router.use(protect);

// Dashboard metrics
router.get('/dashboard', workflowController.getDashboard);

// List & Create
router.get('/', workflowController.getWorkflows);
router.post(
  '/',
  [body('name').optional().trim().notEmpty().withMessage('Workflow name cannot be empty')],
  workflowController.createWorkflow
);

// AI Generation Stub (Phase 3)
router.post('/generate', workflowController.generateWorkflow);

// Single Workflow Operations
router.get('/:id', workflowController.getWorkflow);
router.put('/:id', workflowController.updateWorkflow);
router.post('/:id/duplicate', workflowController.duplicateWorkflow);
router.delete('/:id', workflowController.deleteWorkflow);

// Execution Stub (Phase 4)
router.post('/:id/execute', workflowController.executeWorkflow);

module.exports = router;
