import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  Today as TodayIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useTask } from '../contexts/TaskContext';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

const Scheduler = () => {
  const { tasks, categories, addTask, updateTask } = useTask();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    priority: 'medium',
    start_time: '',
    end_time: '',
    start_datetime: '',
    end_datetime: ''
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const handlePreviousWeek = () => {
    setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
  };

  const handleNextWeek = () => {
    setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setFormData({
      ...formData,
      start_datetime: format(date, 'yyyy-MM-dd'),
      end_datetime: format(date, 'yyyy-MM-dd')
    });
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      await addTask({
        ...formData,
        task_type: 'timerange',
        due_date: selectedDate
      });
      setOpenDialog(false);
      setSelectedDate(null);
    } catch (error) {
      console.error('Error adding scheduled task:', error);
    }
  };

  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      if (task.task_type === 'single' && task.due_date) {
        return isSameDay(new Date(task.due_date), date);
      }
      if (task.task_type === 'timerange' && task.start_datetime) {
        return isSameDay(new Date(task.start_datetime), date);
      }
      return false;
    });
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#666';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Scheduler
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Plan and schedule your tasks with a weekly view
        </Typography>

        {/* Week Navigation */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={handlePreviousWeek}>
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
                </Typography>
                <IconButton onClick={handleNextWeek}>
                  <ArrowForwardIcon />
                </IconButton>
              </Box>
              <Button
                variant="outlined"
                startIcon={<TodayIcon />}
                onClick={handleToday}
              >
                Today
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Weekly Calendar */}
      <Grid container spacing={2}>
        {/* Day Headers */}
        {weekDays.map((day) => (
          <Grid item xs key={day}>
            <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: isToday(day) ? 'primary.light' : 'background.paper' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                {format(day, 'EEE')}
              </Typography>
              <Typography variant="h6" sx={{ color: isToday(day) ? 'white' : 'text.primary' }}>
                {format(day, 'dd')}
              </Typography>
            </Paper>
          </Grid>
        ))}

        {/* Day Content */}
        {weekDays.map((day) => {
          const dayTasks = getTasksForDate(day);
          return (
            <Grid item xs key={day}>
              <Paper 
                sx={{ 
                  p: 2, 
                  minHeight: 200,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    transform: 'scale(1.02)'
                  }
                }}
                onClick={() => handleDateClick(day)}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {format(day, 'MMM dd')}
                  </Typography>
                  <IconButton size="small" onClick={(e) => {
                    e.stopPropagation();
                    handleDateClick(day);
                  }}>
                    <AddIcon />
                  </IconButton>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {dayTasks.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                    No tasks scheduled
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {dayTasks.slice(0, 3).map((task) => (
                      <Chip
                        key={task.id}
                        label={task.title}
                        size="small"
                        sx={{
                          backgroundColor: getCategoryColor(task.category_id),
                          color: 'white',
                          '& .MuiChip-label': { color: 'white' },
                          fontSize: '0.75rem'
                        }}
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <Typography variant="caption" color="text.secondary">
                        +{dayTasks.length - 3} more
                      </Typography>
                    )}
                  </Box>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Add Task Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Schedule Task for {selectedDate && format(selectedDate, 'MMM dd, yyyy')}
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
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Start Time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="End Time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Schedule Task
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Scheduler; 