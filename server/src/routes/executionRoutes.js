const express = require('express');
const executionController = require('../controllers/executionController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all execution routes with JWT authentication
router.use(protect);

// Executions List & Single Run Details
router.get('/', executionController.getExecutions);
router.get('/:id', executionController.getExecution);
router.get('/:id/timeline', executionController.getExecutionTimeline);

// Execution Lifecycle Controls
router.post('/:id/pause', executionController.pauseExecution);
router.post('/:id/resume', executionController.resumeExecution);
router.post('/:id/cancel', executionController.cancelExecution);

module.exports = router;
