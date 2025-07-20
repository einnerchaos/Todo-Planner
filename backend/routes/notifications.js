const express = require('express');
const { body, validationResult } = require('express-validator');
const { dbGet, dbAll, dbRun } = require('../database');

const router = express.Router();

// Get all notifications for user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    
    const notifications = await dbAll(`
      SELECT n.*, t.title as task_title, t.description as task_description
      FROM notifications n
      LEFT JOIN tasks t ON n.task_id = t.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
    `, [userId]);

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread notifications count
router.get('/unread/count', async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    
    const result = await dbGet(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    res.json({ count: result.count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1;

    const result = await dbRun(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    const userId = req.user?.id || 1;

    await dbRun(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1;

    const result = await dbRun(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create notification (internal use)
const createNotification = async (userId, taskId, type, title, message) => {
  try {
    await dbRun(
      'INSERT INTO notifications (user_id, task_id, type, title, message) VALUES (?, ?, ?, ?, ?)',
      [userId, taskId, type, title, message]
    );
  } catch (error) {
    console.error('Create notification error:', error);
  }
};

// Get notifications by type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user?.id || 1;

    const notifications = await dbAll(`
      SELECT n.*, t.title as task_title, t.description as task_description
      FROM notifications n
      LEFT JOIN tasks t ON n.task_id = t.id
      WHERE n.user_id = ? AND n.type = ?
      ORDER BY n.created_at DESC
    `, [userId, type]);

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications by type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get overdue tasks notifications
router.get('/overdue', async (req, res) => {
  try {
    const userId = req.user?.id || 1;

    const overdueTasks = await dbAll(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? 
        AND t.status != 'completed'
        AND (
          (t.task_type = 'single' AND t.due_date < date('now'))
          OR (t.task_type = 'timerange' AND t.end_datetime < datetime('now'))
        )
      ORDER BY t.due_date ASC, t.start_datetime ASC
    `, [userId]);

    res.json(overdueTasks);
  } catch (error) {
    console.error('Get overdue tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get upcoming tasks (next 7 days)
router.get('/upcoming', async (req, res) => {
  try {
    const userId = req.user?.id || 1;

    const upcomingTasks = await dbAll(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? 
        AND t.status != 'completed'
        AND (
          (t.task_type = 'single' AND t.due_date BETWEEN date('now') AND date('now', '+7 days'))
          OR (t.task_type = 'timerange' AND t.start_datetime BETWEEN datetime('now') AND datetime('now', '+7 days'))
        )
      ORDER BY t.due_date ASC, t.start_datetime ASC
    `, [userId]);

    res.json(upcomingTasks);
  } catch (error) {
    console.error('Get upcoming tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get today's tasks
router.get('/today', async (req, res) => {
  try {
    const userId = req.user?.id || 1;

    const todayTasks = await dbAll(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? 
        AND t.status != 'completed'
        AND (
          (t.task_type = 'single' AND t.due_date = date('now'))
          OR (t.task_type = 'timerange' AND date(t.start_datetime) = date('now'))
        )
      ORDER BY t.start_time ASC, t.start_datetime ASC
    `, [userId]);

    res.json(todayTasks);
  } catch (error) {
    console.error('Get today tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 