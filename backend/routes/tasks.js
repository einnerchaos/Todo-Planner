const express = require('express');
const { body, validationResult } = require('express-validator');
const { dbGet, dbAll, dbRun } = require('../database');

const router = express.Router();

// Get all tasks for user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || 1; // Default to demo user
    
    const tasks = await dbAll(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
    `, [userId]);

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get task by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1;

    const task = await dbGet(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ? AND t.user_id = ?
    `, [id, userId]);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new task
router.post('/', [
  body('title').isLength({ min: 1 }).trim().escape(),
  body('description').optional().trim().escape(),
  body('category_id').optional().isInt(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('task_type').optional().isIn(['single', 'timerange']),
  body('due_date').optional().isDate(),
  body('start_time').optional({ nullable: true }).custom(v => !v || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)),
  body('end_time').optional({ nullable: true }).custom(v => !v || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)),
  body('start_datetime').optional().isISO8601(),
  body('end_datetime').optional().isISO8601(),
  body('is_recurring').optional().isBoolean(),
  body('recurring_pattern').optional().isIn(['daily', 'weekly', 'monthly']),
  body('reminder_days').optional().isInt({ min: 0, max: 30 }),
  body('reminder_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id || 1;
    const {
      title, description, category_id, priority, task_type,
      due_date, start_time, end_time, start_datetime, end_datetime,
      is_recurring, recurring_pattern, reminder_days, reminder_time
    } = req.body;

    // Set default values
    const defaultCategoryId = category_id || 1; // Default to first category
    const defaultPriority = priority || 'medium';
    const defaultTaskType = task_type || 'single';
    const defaultStatus = 'pending';

    const result = await dbRun(`
      INSERT INTO tasks (
        user_id, title, description, category_id, priority, task_type, status,
        due_date, start_time, end_time, start_datetime, end_datetime,
        is_recurring, recurring_pattern, reminder_days, reminder_time, snooze_until, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, title, description || '', defaultCategoryId, defaultPriority, defaultTaskType, defaultStatus,
      due_date, start_time || '', end_time || '', start_datetime, end_datetime,
      is_recurring ? 1 : 0, recurring_pattern || null, reminder_days || 3, reminder_time || '09:00', null, null
    ]);

    const newTask = await dbGet(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `, [result.id]);

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    console.log('Update task request body:', req.body);
    
    const { id } = req.params;
    const userId = req.user?.id || 1;

    // Only allow real columns in the tasks table
    const allowedFields = [
      'title', 'description', 'category_id', 'priority', 'status', 'task_type',
      'due_date', 'start_time', 'end_time', 'start_datetime', 'end_datetime',
      'is_recurring', 'recurring_pattern', 'reminder_days', 'reminder_time',
      'snooze_until', 'image_url'
    ];

    // Check if task exists and belongs to user
    const existingTask = await dbGet('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key) && req.body[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(req.body[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id, userId);

    console.log('Update query:', `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`);
    console.log('Update values:', updateValues);

    await dbRun(`
      UPDATE tasks 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `, updateValues);

    const updatedTask = await dbGet(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `, [id]);

    console.log('Task updated successfully:', updatedTask);
    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1;

    const result = await dbRun('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, userId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tasks by status
router.get('/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const userId = req.user?.id || 1;

    const tasks = await dbAll(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.status = ?
      ORDER BY t.created_at DESC
    `, [userId, status]);

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks by status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tasks by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const userId = req.user?.id || 1;

    const tasks = await dbAll(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ? AND t.category_id = ?
      ORDER BY t.created_at DESC
    `, [userId, categoryId]);

    res.json(tasks);
  } catch (error) {
    console.error('Get tasks by category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Snooze task
router.post('/:id/snooze', [
  body('snooze_until').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { snooze_until } = req.body;
    const userId = req.user?.id || 1;

    const result = await dbRun(
      'UPDATE tasks SET snooze_until = ? WHERE id = ? AND user_id = ?',
      [snooze_until, id, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task snoozed successfully' });
  } catch (error) {
    console.error('Snooze task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 