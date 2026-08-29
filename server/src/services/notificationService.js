const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { emitToUser } = require('../config/socket');

/**
 * Notification Service
 * 
 * Manages notification persistence, unread counters, and real-time Socket.IO dispatch.
 */

/**
 * Get paginated notifications and unread counter for a user
 */
async function getUserNotifications(userId, params = {}) {
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit, 10) || 30));
  const skip = (page - 1) * limit;

  const query = { owner: new mongoose.Types.ObjectId(userId) };
  if (params.unreadOnly === true || params.unreadOnly === 'true') {
    query.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('workflowId', 'name version')
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ owner: new mongoose.Types.ObjectId(userId), isRead: false }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Create a new notification and emit live event via Socket.IO
 */
async function createNotification({
  owner,
  workflowId = null,
  executionId = null,
  type = 'info',
  title,
  message,
  metadata = {},
}) {
  if (!owner) return null;

  try {
    const notification = await Notification.create({
      owner: new mongoose.Types.ObjectId(owner),
      workflowId: workflowId ? new mongoose.Types.ObjectId(workflowId) : null,
      executionId: executionId ? new mongoose.Types.ObjectId(executionId) : null,
      type,
      title,
      message,
      metadata,
    });

    // Real-time broadcast to user's private Socket.IO room
    emitToUser(owner.toString(), 'notification:new', notification);

    return notification;
  } catch (err) {
    console.error('[NotificationService] Error creating notification:', err.message);
    return null;
  }
}

/**
 * Helper to generate structured notifications for workflow execution milestones
 */
async function createExecutionNotification({
  owner,
  workflowId,
  workflowName = 'Workflow',
  executionId,
  status,
  duration = 0,
  error = null,
  recoveryReason = null,
}) {
  if (!owner) return null;

  const durationStr = duration > 1000 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`;

  if (status === 'COMPLETED') {
    return createNotification({
      owner,
      workflowId,
      executionId,
      type: 'execution_success',
      title: `Workflow "${workflowName}" Completed`,
      message: `Autonomous swarm finished all steps in ${durationStr}.`,
      metadata: { duration, status: 'COMPLETED' },
    });
  }

  if (status === 'FAILED') {
    if (recoveryReason || error?.code === 'INTEGRATION_NOT_CONNECTED' || error?.code === 'AUTH_EXPIRED') {
      return createNotification({
        owner,
        workflowId,
        executionId,
        type: 'recovery_escalated',
        title: `Action Required: "${workflowName}"`,
        message: recoveryReason || error?.message || 'Recovery agent escalated an integration error.',
        metadata: { error, recoveryReason, status: 'FAILED' },
      });
    }

    return createNotification({
      owner,
      workflowId,
      executionId,
      type: 'execution_failed',
      title: `Workflow "${workflowName}" Failed`,
      message: error?.message || `Execution halted at node ${error?.nodeId || 'unknown'}.`,
      metadata: { error, status: 'FAILED' },
    });
  }

  return null;
}

/**
 * Mark a single notification as read
 */
async function markAsRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(notificationId), owner: new mongoose.Types.ObjectId(userId) },
    { isRead: true },
    { new: true }
  );

  if (notification) {
    emitToUser(userId.toString(), 'notification:read', { notificationId });
  }

  return notification;
}

/**
 * Mark all notifications as read for a user
 */
async function markAllAsRead(userId) {
  const result = await Notification.updateMany(
    { owner: new mongoose.Types.ObjectId(userId), isRead: false },
    { isRead: true }
  );

  emitToUser(userId.toString(), 'notification:read_all', { userId, modifiedCount: result.modifiedCount });
  return { modifiedCount: result.modifiedCount };
}

/**
 * Delete a notification
 */
async function deleteNotification(userId, notificationId) {
  const result = await Notification.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(notificationId),
    owner: new mongoose.Types.ObjectId(userId),
  });

  return Boolean(result);
}

module.exports = {
  getUserNotifications,
  createNotification,
  createExecutionNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
