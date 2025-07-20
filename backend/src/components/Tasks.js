import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Fab,
  Tooltip,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  PriorityHigh as PriorityHighIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import { useTask } from '../contexts/TaskContext';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import axios from 'axios';

const Tasks = () => {
  const { tasks, categories, loading, error } = useTask();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    priority: 'medium',
    task_type: 'single',
    due_date: '',
    start_time: '',
    end_time: ''
  });

  const priorityColors = {
    high: 'error',
    medium: 'warning',
    low: 'success'
  };

  const priorityIcons = {
    high: <PriorityHighIcon />,
    medium: <ArrowUpwardIcon />,
    low: <ArrowDownwardIcon />
  };

  // Direct API functions
  const createTaskDirect = async (taskData) => {
    try {
      const response = await axios.post('/api/tasks', taskData);
      return { success: true, task: response.data };
    } catch (error) {
      console.error('Direct API call error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to create task' 
      };
    }
  };

  const updateTaskDirect = async (id, updates) => {
    try {
      const response = await axios.put(`/api/tasks/${id}`, updates);
      return { success: true, task: response.data };
    } catch (error) {
      console.error('Update task error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to update task' 
      };
    }
  };

  const deleteTaskDirect = async (id) => {
    try {
      await axios.delete(`/api/tasks/${id}`);
      return { success: true };
    } catch (error) {
      console.error('Delete task error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to delete task' 
      };
    }
  };

  const refreshData = async () => {
    try {
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const handleOpenDialog = (task = null) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        category_id: task.category_id,
        priority: task.priority,
        task_type: task.task_type,
        due_date: task.due_date || today,
        start_time: task.start_time || '',
        end_time: task.end_time || ''
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        category_id: categories.length > 0 ? categories[0].id : 1,
        priority: 'medium',
        task_type: 'single',
        due_date: today,
        start_time: '',
        end_time: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const result = await updateTaskDirect(taskId, { status: newStatus });
      if (result.success) {
        refreshData();
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        const result = await deleteTaskDirect(taskId);
        if (result.success) {
          refreshData();
        }
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const getDateDisplay = (date) => {
    if (!date) return '';
    const taskDate = new Date(date);
    if (isToday(taskDate)) return 'Today';
    if (isTomorrow(taskDate)) return 'Tomorrow';
    if (isYesterday(taskDate)) return 'Yesterday';
    return format(taskDate, 'MMM dd, yyyy');
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#666';
  };

  const handleSubmit = async () => {
    try {
      console.log('handleSubmit called');
      console.log('formData:', formData);
      
      // Validate required fields
      if (!formData.title.trim()) {
        alert('Please enter a task title');
        return;
      }

      if (!formData.category_id) {
        alert('Please select a category');
        return;
      }

      if (editingTask) {
        console.log('Updating task:', editingTask.id);
        const result = await updateTaskDirect(editingTask.id, formData);
        if (!result.success) {
          alert(result.error || 'Failed to update task');
          return;
        }
      } else {
        console.log('Creating new task');
        const result = await createTaskDirect(formData);
        console.log('Create task result:', result);
        if (!result.success) {
          alert(result.error || 'Failed to create task');
          return;
        }
      }
      handleCloseDialog();
      refreshData();
    } catch (error) {
      console.error('Error saving task:', error);
      console.error('Error details:', error.message, error.stack);
      alert('An error occurred while saving the task. Please try again.');
    }
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
            Tasks
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your tasks and stay organized
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ borderRadius: 2 }}
        >
          Add Task
        </Button>
      </Box>

      {/* Tasks Grid */}
      <Grid container spacing={3}>
        {tasks.map((task) => (
          <Grid item xs={12} sm={6} md={4} key={task.id}>
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
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {task.title}
                    </Typography>
                    {task.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {task.description}
                      </Typography>
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => handleStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                    sx={{ 
                      color: task.status === 'completed' ? 'success.main' : 'grey.400',
                      '&:hover': { color: 'success.main' }
                    }}
                  >
                    <CheckIcon />
                  </IconButton>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Chip
                    icon={priorityIcons[task.priority]}
                    label={task.priority}
                    color={priorityColors[task.priority]}
                    size="small"
                    variant="outlined"
                  />
                  {task.category_name && (
                    <Chip
                      label={task.category_name}
                      size="small"
                      sx={{ 
                        backgroundColor: getCategoryColor(task.category_id),
                        color: 'white',
                        '& .MuiChip-label': { color: 'white' }
                      }}
                    />
                  )}
                  {task.due_date && (
                    <Chip
                      icon={<ScheduleIcon />}
                      label={getDateDisplay(task.due_date)}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {task.status}
                  </Typography>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(task)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(task.id)}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add/Edit Task Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTask ? 'Edit Task' : 'Add New Task'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Task Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              sx={{ mb: 2 }}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    label="Category"
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    label="Priority"
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingTask ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Tooltip title="Add Task">
        <Fab
          color="primary"
          aria-label="add task"
          onClick={() => handleOpenDialog()}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
          }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>
    </Box>
  );
};

export default Tasks; 