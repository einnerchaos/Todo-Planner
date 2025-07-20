import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
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
  Chip,
  Paper,
  Grid,
  Tooltip,
  Avatar,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Today as TodayIcon,
  ViewWeek as ViewWeekIcon,
  ViewModule as ViewModuleIcon,
  Timeline as TimelineIcon,
  CalendarViewMonth as CalendarViewMonthIcon,
  CalendarViewWeek as CalendarViewWeekIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon
} from '@mui/icons-material';
import { useTask } from '../contexts/TaskContext';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, getWeek, differenceInDays, addDays, isWithinInterval, eachWeekOfInterval, startOfDay, endOfDay } from 'date-fns';

const Timeline = () => {
  const { tasks, categories, createTask, updateTask, deleteTask } = useTask();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
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

  // Drag & Drop State
  const [draggedTask, setDraggedTask] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartDate, setDragStartDate] = useState(null);
  const lastDragUpdateRef = useRef(0);
  const timelineRef = useRef(null);
  // Resize State
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState(null); //resize-start or 'resize-end'
  const [resizeStartX, setResizeStartX] = useState(0);

  // Calculate date ranges based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 })
        };
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        };
      case 'year':
        return {
          start: startOfYear(currentDate),
          end: endOfYear(currentDate)
        };
      default:
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 })
        };
    }
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();
  
  // Get weeks for month and year views
  const getWeeksInRange = () => {
    return eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 1 });
  };

  // Handle mouse down for both drag and resize
  const handleMouseDown = (e, task, action) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('handleMouseDown called with action:', action);
    
    if (action === 'drag') {
      handleDragStart(e, task);
    } else if (action === 'resize-start' || action === 'resize-end') {
      console.log('Starting resize operation:', action);
      setIsResizing(true);
      setResizeType(action);
      setDraggedTask(task);
      setResizeStartX(e.clientX);
    }
  };

  // Simple Drag & Drop Functions
  const handleDragStart = (e, task) => {
    e.preventDefault();
    
    setIsDragging(true);
    setDraggedTask(task);
    setDragStartX(e.clientX);
    setDragStartDate(new Date(task.start_datetime || task.due_date));
    
    // Create drag ghost element directly in DOM
    const ghostElement = document.createElement('div');
    ghostElement.id = 'drag-ghost';
    ghostElement.style.position = 'fixed';
    // Center the ghost on the cursor for better UX
    const ghostWidth = 100;
    const ghostHeight = 32;
    ghostElement.style.left = `${e.clientX - ghostWidth / 2}px`;
    ghostElement.style.top = `${e.clientY - ghostHeight / 2}px`;
    ghostElement.style.width = `${ghostWidth}px`;
    ghostElement.style.height = `${ghostHeight}px`;
    ghostElement.style.backgroundColor = getCategoryColor(task.category_id);
    ghostElement.style.borderRadius = '4px';
    ghostElement.style.display = 'flex';
    ghostElement.style.alignItems = 'center';
    ghostElement.style.justifyContent = 'center';
    ghostElement.style.padding = '4px';
    ghostElement.style.color = 'white';
    ghostElement.style.fontSize = '12px';
    ghostElement.style.cursor = 'grabbing';
    ghostElement.style.userSelect = 'none';
    ghostElement.style.zIndex = '1000';
    ghostElement.style.opacity = '0.8';
    ghostElement.style.transform = 'scale(1.1)';
    ghostElement.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    ghostElement.style.pointerEvents = 'none';
    // Disable any transitions to ensure immediate positioning
    ghostElement.style.transition = 'none';
    ghostElement.style.animation = 'none';
    ghostElement.style.willChange = 'auto';
    ghostElement.textContent = task.title;
    
    document.body.appendChild(ghostElement);
  };

  const handleDrag = useCallback((e) => {
    if (!isDragging || !draggedTask) {
      return;
    }
    
    e.preventDefault();
    
    // Update drag ghost position immediately on every mouse move (no throttling)
    const ghostElement = document.getElementById('drag-ghost');
    if (ghostElement) {
      // Center the ghost on the cursor for better UX
      const ghostWidth = 100;
      const ghostHeight = 32;
      ghostElement.style.left = `${e.clientX - ghostWidth / 2}px`;
      ghostElement.style.top = `${e.clientY - ghostHeight / 2}px`;
    }
    
    // Throttle only drop zone updates for performance
    const now = Date.now();
    if (now - lastDragUpdateRef.current < 50) {
      return;
    }
    lastDragUpdateRef.current = now;
    
    // Update drop zone highlighting via DOM (throttled)
    const timelineElement = document.querySelector('[data-timeline]');
    if (timelineElement) {
      const rect = timelineElement.getBoundingClientRect();
      const x = e.clientX - rect.left - 200; // Subtract task list width
      
      if (x > 0 && viewMode === 'week') {
        const dayWidth = (rect.width - 200) / 7;
        const dayIndex = Math.floor(x / dayWidth);
        
        // Remove previous highlights
        const dayHeaders = document.querySelectorAll('[data-day-header]');
        dayHeaders.forEach(header => {
          header.style.backgroundColor = '';
          header.style.transform = '';
          header.style.color = '';
        });
        
        // Highlight current day
        if (dayIndex >= 0 && dayIndex < dayHeaders.length) {
          const currentHeader = dayHeaders[dayIndex];
          currentHeader.style.backgroundColor = '#4caf50';
          currentHeader.style.color = 'white';
          currentHeader.style.transform = 'scale(1.05)';
        }
      }
    }
  }, [isDragging, draggedTask, viewMode]);

  const handleResize = useCallback(async (e) => {
    if (!isResizing || !draggedTask || !resizeType) {
      return;
    }
    
    e.preventDefault();
    
    // Calculate new date based on mouse position
    const timelineElement = document.querySelector('[data-timeline]');
    if (timelineElement) {
      const rect = timelineElement.getBoundingClientRect();
      const x = e.clientX - rect.left -200;
      
      if (x >0 && viewMode === 'week') {
        const dayWidth = (rect.width -200) / 7;
        const dayIndex = Math.floor(x / dayWidth);
        const newDate = addDays(rangeStart, dayIndex);
        
        // Update task based on resize type
        const originalStart = new Date(draggedTask.start_datetime || draggedTask.due_date);
        const originalEnd = new Date(draggedTask.end_datetime || draggedTask.due_date);
        
        let updatedTask;
        if (resizeType === 'resize-start') {
          // Resizing start date
          const duration = differenceInDays(originalEnd, originalStart);
          updatedTask = {
            ...draggedTask,
            start_datetime: format(newDate, 'yyyy-MM-dd'),
            end_datetime: format(addDays(newDate, duration), 'yyyy-MM-dd'),
            task_type: 'timerange'
          };
        } else if (resizeType === 'resize-end') {
          // Resizing end date
          updatedTask = {
            ...draggedTask,
            end_datetime: format(newDate, 'yyyy-MM-dd'),
            task_type: 'timerange'
          };
        }
        
        // Update the task immediately for visual feedback
        if (updatedTask) {
          try {
            await updateTask(draggedTask.id, updatedTask);
          } catch (error) {
            console.error('Error resizing task:', error);
          }
        }
      }
    }
  }, [isResizing, draggedTask, resizeType, viewMode, rangeStart, updateTask]);

  const handleResizeEnd = useCallback(() => {
    if (!isResizing) {
      return;
    }
    
    setIsResizing(false);
    setResizeType(null);
    setDraggedTask(null);
    setResizeStartX(0);
  }, [isResizing]);

  const handleDragEnd = useCallback(async (e) => {
    
    if (!isDragging || !draggedTask) {
      return;
    }
    
    e.preventDefault();
    
    // Calculate new position based on mouse position
    const timelineElement = document.querySelector('[data-timeline]');
    
    if (timelineElement) {
      const rect = timelineElement.getBoundingClientRect();
      
      const x = e.clientX - rect.left - 200; // Subtract task list width
      
      if (x > 0) {
        let newDate;
        
        switch (viewMode) {
          case 'week':
            const dayWidth = (rect.width - 200) / 7;
            const dayIndex = Math.floor(x / dayWidth);
            newDate = addDays(rangeStart, dayIndex);
            break;
          case 'month':
            const weeks = getWeeksInRange();
            const weekWidth = (rect.width - 200) / weeks.length;
            const weekIndex = Math.floor(x / weekWidth);
            newDate = addDays(rangeStart, weekIndex * 7);
            break;
          case 'year':
            const yearWeeks = eachWeekOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) }, { weekStartsOn: 1 });
            const yearWeekWidth = (rect.width - 200) / yearWeeks.length;
            const yearWeekIndex = Math.floor(x / yearWeekWidth);
            newDate = addDays(startOfYear(currentDate), yearWeekIndex * 7);
            break;
          default:
            newDate = new Date();
        }
        
        try {
          const originalStart = new Date(draggedTask.start_datetime || draggedTask.due_date);
          const originalEnd = new Date(draggedTask.end_datetime || draggedTask.due_date);
          const duration = differenceInDays(originalEnd, originalStart);
          
          const updatedTask = {
            ...draggedTask,
            start_datetime: format(newDate, 'yyyy-MM-dd'),
            end_datetime: format(addDays(newDate, duration), 'yyyy-MM-dd'),
            task_type: 'timerange'
          };

          const result = await updateTask(draggedTask.id, updatedTask);
          
          // Force a re-render to ensure UI reflects the updated state
          if (result.success) {
            // Wait for the next render cycle to ensure state is updated
            await new Promise(resolve => setTimeout(resolve, 0));
            // Trigger a state update to force re-render
            setCurrentDate(prev => new Date(prev));
          }
        } catch (error) {
          console.error('Error moving task:', error);
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
          });
        }
      } else {
        // X position too small, ignoring drag
      }
    } else {
      // Timeline element not found
    }
    
    setIsDragging(false);
    setDraggedTask(null);
    setDragStartX(0);
    setDragStartDate(null);
    
    // Remove drag ghost element from DOM
    const ghostElement = document.getElementById('drag-ghost');
    if (ghostElement) {
      ghostElement.remove();
    }
    
    // Clear all drop zone highlights
    const dayHeaders = document.querySelectorAll('[data-day-header]');
    dayHeaders.forEach(header => {
      header.style.backgroundColor = '';
      header.style.transform = '';
      header.style.color = '';
    });
  }, [isDragging, draggedTask, viewMode, rangeStart, currentDate, updateTask, setCurrentDate, setIsDragging, setDraggedTask, setDragStartX, setDragStartDate]);

  // Add event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      handleDrag(e);
      handleResize(e);
    };
    const handleGlobalMouseUp = (e) => {
      handleDragEnd(e);
      handleResizeEnd();
    };
    
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, draggedTask, handleDrag, handleDragEnd, isResizing, draggedTask, resizeType, handleResize, handleResizeEnd]);

  const handlePreviousPeriod = () => {
    switch (viewMode) {
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case 'year':
        setCurrentDate(subYears(currentDate, 1));
        break;
    }
  };

  const handleNextPeriod = () => {
    switch (viewMode) {
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case 'year':
        setCurrentDate(addYears(currentDate, 1));
        break;
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleAddTask = () => {
    setSelectedDate(null);
    setFormData({
      title: '',
      description: '',
      category_id: categories.length > 0 ? categories[0].id : '',
      priority: 'medium',
      start_time: '',
      end_time: '',
      start_datetime: format(new Date(), 'yyyy-MM-dd'),
      end_datetime: format(new Date(), 'yyyy-MM-dd')
    });
    setOpenDialog(true);
  };

  const handleDateClick = (day) => {
    setSelectedDate(day);
    setFormData({
      ...formData,
      category_id: categories.length > 0 ? categories[0].id : '',
      start_datetime: format(day, 'yyyy-MM-dd'),
      end_datetime: format(day, 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '10:00'
    });
    setOpenDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.title.trim()) {
        alert('Please enter a task title');
        return;
      }

      const taskData = {
        title: formData.title,
        description: formData.description || '',
        category_id: parseInt(formData.category_id) || 1,
        priority: formData.priority,
        task_type: 'timerange',
        start_datetime: formData.start_datetime,
        end_datetime: formData.end_datetime,
        start_time: formData.start_time,
        end_time: formData.end_time
      };

      const result = await createTask(taskData);
      if (result.success) {
        setOpenDialog(false);
        setSelectedDate(null);
      } else {
        alert(result.error || 'Error adding task. Please try again.');
      }
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Error adding task. Please try again.');
    }
  };

  const getTasksInRange = () => {
    const filteredTasks = tasks.filter(task => {
      if (!task.due_date && !task.start_datetime) return false;
      
      const taskStart = task.start_datetime ? new Date(task.start_datetime) : new Date(task.due_date);
      const taskEnd = task.end_datetime ? new Date(task.end_datetime) : new Date(task.due_date);
      
      const isInRange = isWithinInterval(taskStart, { start: rangeStart, end: rangeEnd }) ||
             isWithinInterval(taskEnd, { start: rangeStart, end: rangeEnd }) ||
             (taskStart <= rangeStart && taskEnd >= rangeEnd);
      
      return isInRange;
    });
    
    return filteredTasks;
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#666';
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const getViewTitle = () => {
    switch (viewMode) {
      case 'week':
        return `${format(rangeStart, 'MMM dd')} - ${format(rangeEnd, 'MMM dd, yyyy')}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'year':
        return format(currentDate, 'yyyy');
      default:
        return format(rangeStart, 'MMM dd') + ' - ' + format(rangeEnd, 'MMM dd, yyyy');
    }
  };

  const tasksInRange = getTasksInRange();

  // Gantt Chart Functions - Jira style with drag & drop
  const getTaskBarPosition = (task, viewMode) => {
    const taskStart = task.start_datetime ? new Date(task.start_datetime) : new Date(task.due_date);
    const taskEnd = task.end_datetime ? new Date(task.end_datetime) : new Date(task.due_date);
    
    let totalDays, startOffset, duration;
    
    switch (viewMode) {
      case 'week':
        totalDays = differenceInDays(rangeEnd, rangeStart) + 1;
        startOffset = differenceInDays(taskStart, rangeStart);
        duration = differenceInDays(taskEnd, taskStart) + 1;
        break;
      case 'month':
        const weeks = getWeeksInRange();
        totalDays = weeks.length * 7;
        startOffset = differenceInDays(taskStart, rangeStart);
        duration = differenceInDays(taskEnd, taskStart) + 1;
        break;
      case 'year':
        const yearWeeks = eachWeekOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) }, { weekStartsOn: 1 });
        totalDays = yearWeeks.length * 7;
        startOffset = differenceInDays(taskStart, startOfYear(currentDate));
        duration = differenceInDays(taskEnd, taskStart) + 1;
        break;
      default:
        totalDays = differenceInDays(rangeEnd, rangeStart) + 1;
        startOffset = differenceInDays(taskStart, rangeStart);
        duration = differenceInDays(taskEnd, taskStart) + 1;
    }
    
    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;
    
    return { left: Math.max(0, left), width: Math.min(100, width) };
  };

  const renderWeekView = () => {
    const weekDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    
    return (
      <Box sx={{ overflow: 'auto', maxHeight: '70vh' }}>
        <Box sx={{ display: 'flex', minWidth: 1200 }} data-timeline>
          {/* Task List Column */}
          <Box sx={{ width: 200, flexShrink: 0, borderRight: 1, borderColor: 'divider' }}>
            <Box sx={{ height: 60, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                Tasks
              </Typography>
            </Box>
            {tasksInRange.map((task, index) => (
              <Box
                key={task.id}
                sx={{
                  height: 40,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  fontSize: '0.75rem',
                  overflow: 'hidden',
                  bgcolor: 'background.paper'
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Timeline Grid */}
          <Box sx={{ flex: 1, position: 'relative' }}>
            {/* Day Headers */}
            <Box sx={{ display: 'flex', height: 60, borderBottom: 1, borderColor: 'divider' }}>
              {weekDays.map((day) => (
                <Box
                  key={day}
                  data-day-header
                  sx={{
                    flex: 1,
                    borderRight: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isToday(day) ? 'primary.light' : 'grey.50',
                    color: isToday(day) ? 'white' : 'text.primary',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      bgcolor: isToday(day) ? 'primary.main' : 'action.hover'
                    }
                  }}
                  onClick={() => handleDateClick(day)}
                >
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    {format(day, 'EEE')}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {format(day, 'dd')}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Task Bars */}
            {tasksInRange.map((task, index) => {
              const { left, width } = getTaskBarPosition(task, 'week');
              const isMultiDay = width > 5;
              const isBeingDragged = draggedTask?.id === task.id;
              
              return (
                <Box
                  key={`${task.id}-${task.start_datetime}-${task.end_datetime}`}
                  draggable
                  data-task-id={task.id}
                  data-task-title={task.title}
                  sx={{
                    position: 'absolute',
                    left: `${left}%`,
                    width: `${width}%`,
                    height: 32,
                    top: 60 + (index * 40),
                    bgcolor: getCategoryColor(task.category_id),
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1,
                    color: 'white',
                    fontSize: '0.75rem',
                    cursor: 'grab',
                    userSelect: 'none',
                    '&:hover': {
                      opacity: 0.8,
                      // Removed transform: scale and transition
                    },
                    '&:active': {
                      cursor: 'grabbing'
                    },
                    zIndex: isBeingDragged ? 10 : 1,
                    opacity: isBeingDragged ? 0.8 : 1,
                    // Removed transform: scale for drag state
                    transition: 'opacity 0.2s ease-in-out'
                  }}
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDrag={(e) => handleDrag(e)}
                  onDragEnd={(e) => handleDragEnd(e)}
                >
                  {/* Left resize handle */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -4,
                      top: 2,
                      width: 6,
                      height: 28,
                      cursor: 'ew-resize',
                      zIndex: 1000,
                      backgroundColor: 'rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0,0,0,0.15)',
                      borderRadius: '2px',
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.18)',
                        border: '1px solid rgba(0,0,0,0.3)',
                        transform: 'scale(1.15)'
                      }
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleMouseDown(e, task, 'resize-start');
                    }}
                  />
                  {/* Right resize handle */}
                  <Box
                    sx={{
                      position: 'absolute',
                      right: -4,
                      top: 2,
                      width: 6,
                      height: 28,
                      cursor: 'ew-resize',
                      zIndex: 1000,
                      backgroundColor: 'rgba(0,0,0,0.08)',
                      border: '1px solid rgba(0,0,0,0.15)',
                      borderRadius: '2px',
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.18)',
                        border: '1px solid rgba(0,0,0,0.3)',
                        transform: 'scale(1.15)'
                      }
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleMouseDown(e, task, 'resize-end');
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, overflow: 'hidden' }}>
                    {isMultiDay ? (
                      <>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                          {task.title}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          {format(new Date(task.start_datetime || task.due_date), 'MMM dd')} - {format(new Date(task.end_datetime || task.due_date), 'MMM dd')}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                        {task.title}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed');
                      }}
                      sx={{ 
                        color: 'white',
                        p: 0.5,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                      }}
                    >
                      <CheckIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(task.id);
                      }}
                      sx={{ 
                        color: 'white',
                        p: 0.5,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                </Box>
              );
            })}

            {/* Grid Lines */}
            <Box sx={{ 
              display: 'flex', 
              position: 'absolute', 
              top: 60, 
              left: 0, 
              right: 0, 
              bottom: 0,
              zIndex: 0
            }}>
              {weekDays.map((day, index) => (
                <Box
                  key={day}
                  sx={{
                    flex: 1,
                    borderRight: index < weekDays.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    bgcolor: isToday(day) ? 'primary.light' : 'transparent',
                    opacity: isToday(day) ? 0.1 : 0.05
                  }}
                />
              ))}
            </Box>
            
          </Box>
        </Box>
      </Box>
    );
  };

  // ... existing code for month and year views (simplified for brevity)
  const renderMonthView = () => {
    const weeks = getWeeksInRange();
    
    return (
      <Box sx={{ overflow: 'auto', maxHeight: '70vh' }}>
        <Box sx={{ display: 'flex', minWidth: 1400 }} ref={timelineRef}>
          {/* Task List Column */}
          <Box sx={{ width: 200, flexShrink: 0, borderRight: 1, borderColor: 'divider' }}>
            <Box sx={{ height: 60, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                Tasks
              </Typography>
            </Box>
            {tasksInRange.map((task, index) => (
              <Box
                key={task.id}
                sx={{
                  height: 30,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  fontSize: '0.7rem',
                  overflow: 'hidden',
                  bgcolor: 'background.paper'
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Week Columns */}
          {weeks.map((week) => {
            const weekDays = eachDayOfInterval({ start: week, end: endOfWeek(week, { weekStartsOn: 1 }) });
            return (
              <Box key={week} sx={{ flex: 1, minWidth: 120 }}>
                {/* Week Header */}
                <Box
                  sx={{
                    height: 60,
                    borderBottom: 1,
                    borderRight: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'grey.50'
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    {format(week, 'MMM dd')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Week {getWeek(week, { weekStartsOn: 1 })}
                  </Typography>
                </Box>

                {/* Day Slots */}
                {weekDays.map((day) => {
                  const dayTasks = tasks.filter(task => {
                    if (task.task_type === 'single' && task.due_date) {
                      return isSameDay(new Date(task.due_date), day);
                    }
                    if (task.task_type === 'timerange' && task.start_datetime) {
                      const taskDate = new Date(task.start_datetime);
                      return isSameDay(taskDate, day);
                    }
                    return false;
                  });

                  return (
                    <Box
                      key={day}
                      sx={{
                        height: 30,
                        borderBottom: 1,
                        borderRight: 1,
                        borderColor: 'divider',
                        position: 'relative',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                      onClick={() => handleDateClick(day)}
                    >
                      <Box sx={{ p: 0.5, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.6rem' }}>
                          {format(day, 'dd')}
                        </Typography>
                      </Box>
                      {dayTasks.map((task, index) => {
                        const isBeingDragged = draggedTask?.id === task.id;
                        
                        return (
                          <Box
                            key={task.id}
                            sx={{
                              position: 'absolute',
                              top: 2 + (index * 12),
                              left: 1,
                              right: 1,
                              height: 10,
                              bgcolor: getCategoryColor(task.category_id),
                              color: 'white',
                              borderRadius: 0.5,
                              p: 0.5,
                              fontSize: '0.6rem',
                              overflow: 'hidden',
                              zIndex: isBeingDragged ? 10 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'grab',
                              '&:active': {
                                cursor: 'grabbing'
                              },
                              opacity: isBeingDragged ? 0.8 : 1,
                              transform: isBeingDragged ? 'scale(1.05)' : 'scale(1)',
                              transition: 'all 0.2s ease-in-out'
                            }}
                            onMouseDown={(e) => handleMouseDown(e, task, 'drag')}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Left resize handle */}
                            <Box
                              sx={{
                                position: 'absolute',
                                left: -5,
                                top: -2,
                                width: 12,
                                height: 14,
                                cursor: 'ew-resize',
                                zIndex: 1000,
                                backgroundColor: 'red',
                                border: '2px solid yellow',
                                borderRadius: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '8px',
                                color: 'white',
                                fontWeight: 'bold',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  backgroundColor: 'orange',
                                  transform: 'scale(1.3)'
                                }
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                console.log('Left resize handle clicked');
                                handleMouseDown(e, task, 'resize-start');
                              }}
                            >
                              L
                            </Box>
                            
                            {/* Right resize handle */}
                            <Box
                              sx={{
                                position: 'absolute',
                                right: -5,
                                top: -2,
                                width: 12,
                                height: 14,
                                cursor: 'ew-resize',
                                zIndex: 1000,
                                backgroundColor: 'red',
                                border: '2px solid yellow',
                                borderRadius: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '8px',
                                color: 'white',
                                fontWeight: 'bold',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  backgroundColor: 'orange',
                                  transform: 'scale(1.3)'
                                }
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                console.log('Right resize handle clicked');
                                handleMouseDown(e, task, 'resize-end');
                              }}
                            >
                              R
                            </Box>
                            
                            <Typography variant="caption" sx={{ fontWeight: 'bold', flex: 1, overflow: 'hidden', fontSize: '0.5rem' }}>
                              {task.title}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                                sx={{ 
                                  color: 'white',
                                  p: 0.5,
                                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                                }}
                              >
                                <CheckIcon sx={{ fontSize: 8 }} />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(task.id)}
                                sx={{ 
                                  color: 'white',
                                  p: 0.5,
                                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: 8 }} />
                              </IconButton>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderYearView = () => {
    const yearWeeks = eachWeekOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) }, { weekStartsOn: 1 });
    
    return (
      <Box sx={{ overflow: 'auto', maxHeight: '70vh' }}>
        <Box sx={{ display: 'flex', minWidth: 1600 }} ref={timelineRef}>
          {/* Task List Column */}
          <Box sx={{ width: 200, flexShrink: 0, borderRight: 1, borderColor: 'divider' }}>
            <Box sx={{ height: 60, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                Tasks
              </Typography>
            </Box>
            {tasksInRange.map((task, index) => (
              <Box
                key={task.id}
                sx={{
                  height: 25,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  fontSize: '0.65rem',
                  overflow: 'hidden',
                  bgcolor: 'background.paper'
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Week Columns */}
          {yearWeeks.map((week) => {
            const weekTasks = tasks.filter(task => {
              if (task.task_type === 'single' && task.due_date) {
                const taskDate = new Date(task.due_date);
                return isWithinInterval(taskDate, { start: week, end: endOfWeek(week, { weekStartsOn: 1 }) });
              }
              if (task.task_type === 'timerange' && task.start_datetime) {
                const taskDate = new Date(task.start_datetime);
                return isWithinInterval(taskDate, { start: week, end: endOfWeek(week, { weekStartsOn: 1 }) });
              }
              return false;
            });

            return (
              <Box key={week} sx={{ flex: 1, minWidth: 80 }}>
                {/* Week Header */}
                <Box
                  sx={{
                    height: 60,
                    borderBottom: 1,
                    borderRight: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'grey.50'
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.6rem' }}>
                    {format(week, 'MMM dd')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.5rem' }}>
                    W{getWeek(week, { weekStartsOn: 1 })}
                  </Typography>
                </Box>

                {/* Week Content */}
                <Box
                  sx={{
                    height: 25,
                    borderBottom: 1,
                    borderRight: 1,
                    borderColor: 'divider',
                    position: 'relative',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => handleDateClick(week)}
                >
                  {weekTasks.map((task, index) => {
                    const isBeingDragged = draggedTask?.id === task.id;
                    
                    return (
                      <Box
                        key={task.id}
                        sx={{
                          position: 'absolute',
                          top: 2 + (index * 8),
                          left: 1,
                          right: 1,
                          height: 6,
                          bgcolor: getCategoryColor(task.category_id),
                          color: 'white',
                          borderRadius: 0.5,
                          p: 0.5,
                          fontSize: '0.5rem',
                          overflow: 'hidden',
                          zIndex: isBeingDragged ? 10 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'grab',
                          '&:active': {
                            cursor: 'grabbing'
                          },
                          opacity: isBeingDragged ? 0.8 : 1,
                          transform: isBeingDragged ? 'scale(1.05)' : 'scale(1)',
                          transition: 'all 0.2s ease-in-out'
                        }}
                        onMouseDown={(e) => handleMouseDown(e, task, 'drag')}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 'bold', flex: 1, overflow: 'hidden', fontSize: '0.4rem' }}>
                          {task.title}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                            sx={{ 
                              color: 'white',
                              p: 0.5,
                              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                            }}
                          >
                            <CheckIcon sx={{ fontSize: 6 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(task.id)}
                            sx={{ 
                              color: 'white',
                              p: 0.5,
                              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 6 }} />
                          </IconButton>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderTimelineView = () => {
    switch (viewMode) {
      case 'week':
        return renderWeekView();
      case 'month':
        return renderMonthView();
      case 'year':
        return renderYearView();
      default:
        return renderWeekView();
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              Gantt Timeline
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Visualize your tasks with a comprehensive Gantt chart view
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddTask}
            sx={{ borderRadius: 2 }}
          >
            Add Task
          </Button>
        </Box>

        {/* Navigation Controls */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton onClick={handlePreviousPeriod}>
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 'bold', minWidth: 200 }}>
                  {getViewTitle()}
                </Typography>
                <IconButton onClick={handleNextPeriod}>
                  <ArrowForwardIcon />
                </IconButton>
                <Button
                  variant="outlined"
                  startIcon={<TodayIcon />}
                  onClick={handleToday}
                  sx={{ ml: 2 }}
                >
                  Today
                </Button>
              </Box>

              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, newViewMode) => {
                  if (newViewMode !== null) {
                    setViewMode(newViewMode);
                  }
                }}
                size="small"
              >
                <ToggleButton value="week">
                  <Tooltip title="Week View">
                    <ViewWeekIcon />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="month">
                  <Tooltip title="Month View">
                    <CalendarViewMonthIcon />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="year">
                  <Tooltip title="Year View">
                    <CalendarViewWeekIcon />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Timeline View */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            {viewMode === 'week' ? 'Week' : viewMode === 'month' ? 'Month' : 'Year'} Timeline
          </Typography>
          
          {tasksInRange.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ScheduleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                No tasks in this period
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click "Add Task" to create your first task
              </Typography>
            </Box>
          ) : (
            renderTimelineView()
          )}
        </CardContent>
      </Card>

      {/* Task Summary */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            {viewMode === 'week' ? 'Week' : viewMode === 'month' ? 'Month' : 'Year'} Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {tasksInRange.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Tasks
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  {tasksInRange.filter(task => task.status === 'completed').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                  {tasksInRange.filter(task => task.status === 'pending').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                  {tasksInRange.filter(task => task.priority === 'high').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  High Priority
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Add Task Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedDate ? `Add Task for ${format(selectedDate, 'MMM dd, yyyy')}` : 'Add New Task'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Task Title *"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              sx={{ mb: 2 }}
              required
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
                  <InputLabel>Category *</InputLabel>
                  <Select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    label="Category *"
                    required
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
                  label="Start Date"
                  type="date"
                  value={formData.start_datetime}
                  onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={formData.end_datetime}
                  onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={{ mb: 2 }}
                />
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
            Add Task
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Timeline; 