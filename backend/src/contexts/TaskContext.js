import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const TaskContext = createContext();

export const useTask = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksRes, categoriesRes, notificationsRes] = await Promise.all([
        axios.get('/api/tasks'),
        axios.get('/api/categories'),
        axios.get('/api/notifications')
      ]);

      setTasks(tasksRes.data);
      setCategories(categoriesRes.data);
      setNotifications(notificationsRes.data);
      setError(null);
    } catch (error) {
      console.error('Load data error:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Task operations
  const createTask = async (taskData) => {
    try {
      const response = await axios.post('/api/tasks', taskData);
      setTasks(prev => [response.data, ...prev]);
      return { success: true, task: response.data };
    } catch (error) {
      console.error('Create task error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to create task' 
      };
    }
  };

  const updateTask = async (id, updates) => {
    try {
      const response = await axios.put(`/api/tasks/${id}`, updates);
      setTasks(prev => prev.map(task => 
        task.id === id ? response.data : task
      ));
      return { success: true, task: response.data };
    } catch (error) {
      console.error('Update task error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to update task' 
      };
    }
  };

  const deleteTask = async (id) => {
    try {
      await axios.delete(`/api/tasks/${id}`);
      setTasks(prev => prev.filter(task => task.id !== id));
      return { success: true };
    } catch (error) {
      console.error('Delete task error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to delete task' 
      };
    }
  };

  const toggleTaskStatus = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return { success: false, error: 'Task not found' };

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    return await updateTask(id, { status: newStatus });
  };

  const snoozeTask = async (id, snoozeUntil) => {
    return await updateTask(id, { snooze_until: snoozeUntil });
  };

  // Category operations
  const createCategory = async (categoryData) => {
    try {
      const response = await axios.post('/api/categories', categoryData);
      setCategories(prev => [...prev, response.data]);
      return { success: true, category: response.data };
    } catch (error) {
      console.error('Create category error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to create category' 
      };
    }
  };

  const updateCategory = async (id, updates) => {
    try {
      const response = await axios.put(`/api/categories/${id}`, updates);
      setCategories(prev => prev.map(category => 
        category.id === id ? response.data : category
      ));
      return { success: true, category: response.data };
    } catch (error) {
      console.error('Update category error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to update category' 
      };
    }
  };

  const deleteCategory = async (id) => {
    try {
      await axios.delete(`/api/categories/${id}`);
      setCategories(prev => prev.filter(category => category.id !== id));
      return { success: true };
    } catch (error) {
      console.error('Delete category error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to delete category' 
      };
    }
  };

  // Notification operations
  const markNotificationRead = async (id) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(notification => 
        notification.id === id ? { ...notification, is_read: 1 } : notification
      ));
      return { success: true };
    } catch (error) {
      console.error('Mark notification read error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to mark notification as read' 
      };
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await axios.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(notification => ({ ...notification, is_read: 1 })));
      return { success: true };
    } catch (error) {
      console.error('Mark all notifications read error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to mark all notifications as read' 
      };
    }
  };

  const deleteNotification = async (id) => {
    try {
      await axios.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(notification => notification.id !== id));
      return { success: true };
    } catch (error) {
      console.error('Delete notification error:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Failed to delete notification' 
      };
    }
  };

  // Filter functions
  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const getTasksByCategory = (categoryId) => {
    return tasks.filter(task => task.category_id === categoryId);
  };

  const getTasksByDate = (date) => {
    return tasks.filter(task => {
      if (task.task_type === 'single') {
        return task.due_date === date;
      } else {
        const taskDate = new Date(task.start_datetime).toISOString().split('T')[0];
        return taskDate === date;
      }
    });
  };

  const getOverdueTasks = () => {
    const now = new Date();
    return tasks.filter(task => {
      if (task.status === 'completed') return false;
      
      if (task.task_type === 'single') {
        return task.due_date && new Date(task.due_date) < now;
      } else {
        return task.end_datetime && new Date(task.end_datetime) < now;
      }
    });
  };

  const getUpcomingTasks = (days = 7) => {
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);

    return tasks.filter(task => {
      if (task.status === 'completed') return false;
      
      if (task.task_type === 'single') {
        const dueDate = new Date(task.due_date);
        return dueDate >= now && dueDate <= future;
      } else {
        const startDate = new Date(task.start_datetime);
        return startDate >= now && startDate <= future;
      }
    });
  };

  const getTodayTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    return getTasksByDate(today);
  };

  const value = {
    // State
    tasks,
    categories,
    notifications,
    loading,
    error,
    
    // Task operations
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    snoozeTask,
    
    // Category operations
    createCategory,
    updateCategory,
    deleteCategory,
    
    // Notification operations
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    
    // Filter functions
    getTasksByStatus,
    getTasksByCategory,
    getTasksByDate,
    getOverdueTasks,
    getUpcomingTasks,
    getTodayTasks,
    
    // Utility
    refreshData: loadData
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}; 