import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  Avatar,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ColorLens as ColorIcon
} from '@mui/icons-material';
import { useTask } from '../contexts/TaskContext';

const Categories = () => {
  const { categories, tasks, loading, error, addCategory, updateCategory, deleteCategory } = useTask();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3f51b5',
    icon: '📋'
  });

  const handleOpenDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        color: category.color,
        icon: category.icon || '📋'
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        color: '#3f51b5',
        icon: '📋'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
      } else {
        await addCategory(formData);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDelete = async (categoryId) => {
    const tasksInCategory = tasks.filter(task => task.category_id === categoryId);
    if (tasksInCategory.length > 0) {
      alert(`Cannot delete category. It has ${tasksInCategory.length} task(s). Please reassign or delete the tasks first.`);
      return;
    }

    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteCategory(categoryId);
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const getTaskCount = (categoryId) => {
    return tasks.filter(task => task.category_id === categoryId).length;
  };

  const getCompletedTaskCount = (categoryId) => {
    return tasks.filter(task => task.category_id === categoryId && task.status === 'completed').length;
  };

  const getProgressPercentage = (categoryId) => {
    const total = getTaskCount(categoryId);
    const completed = getCompletedTaskCount(categoryId);
    return total > 0 ? (completed / total) * 100 : 0;
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Categories
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Organize your tasks with custom categories
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ borderRadius: 2 }}
        >
          Add Category
        </Button>
      </Box>

      {/* Categories Grid */}
      <Grid container spacing={3}>
        {categories.map((category) => (
          <Grid item xs={12} sm={6} md={4} key={category.id}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: category.color, 
                        mr: 2,
                        width: 48,
                        height: 48,
                        fontSize: '1.5rem'
                      }}
                    >
                      {category.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {category.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getTaskCount(category.id)} tasks
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(category)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(category.id)}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>

                {/* Progress Bar */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getCompletedTaskCount(category.id)}/{getTaskCount(category.id)} completed
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: '100%',
                      height: 6,
                      backgroundColor: 'grey.200',
                      borderRadius: 3,
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        width: `${getProgressPercentage(category.id)}%`,
                        height: '100%',
                        backgroundColor: category.color,
                        transition: 'width 0.3s ease-in-out'
                      }}
                    />
                  </Box>
                </Box>

                {/* Task Status Chips */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip
                    label={`${getCompletedTaskCount(category.id)} completed`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    label={`${getTaskCount(category.id) - getCompletedTaskCount(category.id)} pending`}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add/Edit Category Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Category Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Icon (emoji)"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              helperText="Enter an emoji or icon"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Color"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
            
            {/* Color Preview */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="body2">Preview:</Typography>
              <Avatar 
                sx={{ 
                  bgcolor: formData.color,
                  width: 40,
                  height: 40,
                  fontSize: '1.2rem'
                }}
              >
                {formData.icon}
              </Avatar>
              <Typography variant="body2" sx={{ color: formData.color, fontWeight: 'bold' }}>
                {formData.name || 'Category Name'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingCategory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Categories; 