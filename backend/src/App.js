import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TaskProvider } from './contexts/TaskContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Timeline from './components/Timeline';
import Categories from './components/Categories';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <TaskProvider>
          <div className="App">
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="timeline" element={<Timeline />} />
                <Route path="categories" element={<Categories />} />
              </Route>
            </Routes>
          </div>
        </TaskProvider>
      </AuthProvider>
    </Router>
  );
}

export default App; 