const express = require('express');
const { body, validationResult } = require('express-validator');
const { dbGet, dbAll, dbRun } = require('../database');

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    
    const categories = await dbAll(`
      SELECT * FROM categories 
      WHERE user_id IS NULL OR user_id = ?
      ORDER BY name
    `, [userId]);

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1;

    const category = await dbGet(`
      SELECT * FROM categories 
      WHERE id = ? AND (user_id IS NULL OR user_id = ?)
    `, [id, userId]);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new category
router.post('/', [
  body('name').isLength({ min: 1, max: 50 }).trim().escape(),
  body('color').isHexColor(),
  body('icon').optional().isLength({ max: 10 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id || 1;
    const { name, color, icon } = req.body;

    // Check if category already exists for user
    const existingCategory = await dbGet(
      'SELECT id FROM categories WHERE name = ? AND (user_id = ? OR user_id IS NULL)',
      [name, userId]
    );

    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const result = await dbRun(
      'INSERT INTO categories (user_id, name, color, icon) VALUES (?, ?, ?, ?)',
      [userId, name, color, icon || '📋']
    );

    const newCategory = await dbGet('SELECT * FROM categories WHERE id = ?', [result.id]);
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update category
router.put('/:id', [
  body('name').optional().isLength({ min: 1, max: 50 }).trim().escape(),
  body('color').optional().isHexColor(),
  body('icon').optional().isLength({ max: 10 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const userId = req.user?.id || 1;

    // Check if category exists and belongs to user
    const existingCategory = await dbGet(
      'SELECT id FROM categories WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existingCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(req.body[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateValues.push(id, userId);

    await dbRun(`
      UPDATE categories 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `, updateValues);

    const updatedCategory = await dbGet('SELECT * FROM categories WHERE id = ?', [id]);
    res.json(updatedCategory);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1;

    // Check if category is being used by any tasks
    const tasksUsingCategory = await dbGet(
      'SELECT COUNT(*) as count FROM tasks WHERE category_id = ? AND user_id = ?',
      [id, userId]
    );

    if (tasksUsingCategory.count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category that has tasks. Please reassign or delete the tasks first.' 
      });
    }

    const result = await dbRun(
      'DELETE FROM categories WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get category statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1;

    const stats = await dbGet(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
        SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority_tasks,
        SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium_priority_tasks,
        SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low_priority_tasks
      FROM tasks 
      WHERE category_id = ? AND user_id = ?
    `, [id, userId]);

    res.json(stats);
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 