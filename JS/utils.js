// js/utils.js

// Alert system
function showAlert(message, type = 'info', duration = 5000) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const icon = getAlertIcon(type);
    alert.innerHTML = `
        <div class="alert-content">
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="alert-close" onclick="closeAlert(this)">
            <i class="fas fa-times"></i>
        </button>
    `;

    alertContainer.appendChild(alert);

    // Auto remove after duration
    setTimeout(() => {
        if (alert.parentNode) {
            closeAlert(alert.querySelector('.alert-close'));
        }
    }, duration);
}

function getAlertIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function closeAlert(button) {
    const alert = button.closest('.alert');
    alert.style.opacity = '0';
    alert.style.transform = 'translateX(100%)';
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 300);
}

// Loading system
let loadingOverlay = null;

function showLoading(message = 'Loading...') {
    hideLoading(); // Remove any existing loading

    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        </div>
    `;

    document.body.appendChild(loadingOverlay);
}

function hideLoading() {
    if (loadingOverlay && loadingOverlay.parentNode) {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
        loadingOverlay = null;
    }
}

// Date and time utilities
function formatDate(dateString, includeTime = false) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };
    
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('en-US', options);
}

function formatTime(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
}

function getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((date - now) / 1000);
    
    if (diffInSeconds < 0) {
        const absDiff = Math.abs(diffInSeconds);
        if (absDiff < 60) return 'Just now';
        if (absDiff < 3600) return `${Math.floor(absDiff / 60)} minutes ago`;
        if (absDiff < 86400) return `${Math.floor(absDiff / 3600)} hours ago`;
        if (absDiff < 604800) return `${Math.floor(absDiff / 86400)} days ago`;
        return formatDate(dateString);
    } else {
        if (diffInSeconds < 60) return 'Now';
        if (diffInSeconds < 3600) return `In ${Math.floor(diffInSeconds / 60)} minutes`;
        if (diffInSeconds < 86400) return `In ${Math.floor(diffInSeconds / 3600)} hours`;
        if (diffInSeconds < 604800) return `In ${Math.floor(diffInSeconds / 86400)} days`;
        return formatDate(dateString);
    }
}

function isOverdue(dateString) {
    return new Date(dateString) < new Date();
}

function getDaysUntilDue(dateString) {
    const dueDate = new Date(dateString);
    const now = new Date();
    const diffTime = dueDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Form utilities
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function sanitizeInput(input) {
    const temp = document.createElement('div');
    temp.textContent = input;
    return temp.innerHTML;
}

function serializeForm(form) {
    const formData = new FormData(form);
    const data = {};
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    return data;
}

// API utilities
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const config = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Priority and status utilities
function getPriorityColor(priority) {
    switch (priority.toLowerCase()) {
        case 'low': return '#28a745';
        case 'medium': return '#ffc107';
        case 'high': return '#fd7e14';
        case 'critical': return '#dc3545';
        default: return '#6c757d';
    }
}

function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'completed': return '#28a745';
        case 'in progress': return '#007bff';
        case 'pending': return '#ffc107';
        case 'overdue': return '#dc3545';
        default: return '#6c757d';
    }
}

function getPriorityIcon(priority) {
    switch (priority.toLowerCase()) {
        case 'low': return 'fa-arrow-down';
        case 'medium': return 'fa-minus';
        case 'high': return 'fa-arrow-up';
        case 'critical': return 'fa-exclamation';
        default: return 'fa-minus';
    }
}

// Local storage utilities
function setStorageItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function getStorageItem(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return defaultValue;
    }
}

function removeStorageItem(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error removing from localStorage:', error);
    }
}

// DOM utilities
function createElement(tag, className = '', innerHTML = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
}

function toggleClass(element, className) {
    if (element.classList.contains(className)) {
        element.classList.remove(className);
    } else {
        element.classList.add(className);
    }
}

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Color utilities
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function getContrastColor(hexColor) {
    const rgb = hexToRgb(hexColor);
    if (!rgb) return '#000000';
    
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return brightness > 125 ? '#000000' : '#ffffff';
}

// Number utilities
function calculatePercentage(earned, total) {
    if (total === 0) return 0;
    return Math.round((earned / total) * 100 * 100) / 100;
}

function formatGPA(gpa) {
    return parseFloat(gpa).toFixed(2);
}

// Export utilities for use in other modules
window.utils = {
    showAlert,
    showLoading,
    hideLoading,
    formatDate,
    formatTime,
    getRelativeTime,
    isOverdue,
    getDaysUntilDue,
    validateEmail,
    sanitizeInput,
    serializeForm,
    apiRequest,
    getPriorityColor,
    getStatusColor,
    getPriorityIcon,
    setStorageItem,
    getStorageItem,
    removeStorageItem,
    createElement,
    toggleClass,
    debounce,
    hexToRgb,
    getContrastColor,
    calculatePercentage,
    formatGPA
};
