// js/dashboard.js
class Dashboard {
    constructor() {
        this.currentSection = 'overview';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboardData();
        this.setupSidebar();
    }

    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notifications')) {
                this.closeNotificationDropdown();
            }
            if (!e.target.closest('.user-menu')) {
                this.closeUserMenuDropdown();
            }
        });
    }

    setupSidebar() {
        const navItems = document.querySelectorAll('.nav-item a');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('onclick').match(/'([^']+)'/)[1];
                this.showSection(section);
            });
        });
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        sidebar.classList.toggle('collapsed');
    }

    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeNavItem = document.querySelector(`[onclick="showSection('${sectionName}')"]`).parentElement;
        activeNavItem.classList.add('active');

        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionName;
            this.updatePageTitle(sectionName);
            this.loadSectionData(sectionName);
        }
    }

    updatePageTitle(sectionName) {
        const titles = {
            'overview': 'Dashboard',
            'courses': 'Course Management',
            'assignments': 'Assignment Tracker',
            'study-sessions': 'Study Sessions',
            'grades': 'Grade Management',
            'calendar': 'Academic Calendar'
        };

        const subtitles = {
            'overview': 'Welcome back! Here\'s your academic overview.',
            'courses': 'Manage your enrolled courses and schedules.',
            'assignments': 'Track and organize your assignments.',
            'study-sessions': 'Schedule and manage your study time.',
            'grades': 'Monitor your academic performance.',
            'calendar': 'View your complete academic schedule.'
        };

        document.getElementById('pageTitle').textContent = titles[sectionName] || 'Dashboard';
        document.getElementById('pageSubtitle').textContent = subtitles[sectionName] || '';
    }

    async loadDashboardData() {
        try {
            showLoading('Loading dashboard...');
            
            // Load overview stats
            await this.loadOverviewStats();
            
            // Load recent data for dashboard cards
            await this.loadUpcomingDeadlines();
            await this.loadTodaySchedule();
            await this.loadRecentGrades();
            await this.loadProgressChart();
            
            hideLoading();
        } catch (error) {
            hideLoading();
            console.error('Error loading dashboard:', error);
            showAlert('Failed to load dashboard data', 'error');
        }
    }

    async loadOverviewStats() {
        try {
            const [coursesRes, assignmentsRes, gradesRes, studyRes] = await Promise.all([
                fetch('/api/courses.php?action=count'),
                fetch('/api/assignments.php?action=stats'),
                fetch('/api/grades.php?action=average'),
                fetch('/api/study-sessions.php?action=weekly-hours')
            ]);

            const [courses, assignments, grades, study] = await Promise.all([
                coursesRes.json(),
                assignmentsRes.json(),
                gradesRes.json(),
                studyRes.json()
            ]);

            // Update stat cards
            if (courses.success) {
                document.getElementById('totalCourses').textContent = courses.count || 0;
            }
            
            if (assignments.success) {
                document.getElementById('pendingAssignments').textContent = assignments.pending || 0;
            }
            
            if (grades.success) {
                document.getElementById('averageGrade').textContent = formatGPA(grades.average || 0);
            }
            
            if (study.success) {
                document.getElementById('studyHours').textContent = study.hours || 0;
            }

        } catch (error) {
            console.error('Error loading overview stats:', error);
        }
    }

    async loadUpcomingDeadlines() {
        try {
            const response = await fetch('/api/assignments.php?action=upcoming&limit=5');
            const result = await response.json();
            
            const container = document.getElementById('upcomingDeadlines');
            
            if (result.success && result.assignments.length > 0) {
                container.innerHTML = result.assignments.map(assignment => `
                    <div class="deadline-item ${isOverdue(assignment.due_date) ? 'overdue' : ''}">
                        <div class="deadline-info">
                            <h4>${assignment.title}</h4>
                            <p class="course-name">${assignment.course_title}</p>
                            <p class="due-date">
                                <i class="fas fa-clock"></i>
                                ${getRelativeTime(assignment.due_date)}
                            </p>
                        </div>
                        <div class="deadline-priority">
                            <span class="priority-badge priority-${assignment.priority.toLowerCase()}">
                                ${assignment.priority}
                            </span>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="no-data">No upcoming deadlines</p>';
            }
        } catch (error) {
            console.error('Error loading upcoming deadlines:', error);
            document.getElementById('upcomingDeadlines').innerHTML = '<p class="no-data">Failed to load deadlines</p>';
        }
    }

    async loadTodaySchedule() {
        try {
            const response = await fetch('/api/courses.php?action=today-schedule');
            const result = await response.json();
            
            const container = document.getElementById('todaySchedule');
            
            if (result.success && result.schedule.length > 0) {
                container.innerHTML = result.schedule.map(item => `
                    <div class="schedule-item">
                        <div class="schedule-time">
                            <i class="fas fa-clock"></i>
                            ${formatTime(item.time_start)} - ${formatTime(item.time_end)}
                        </div>
                        <div class="schedule-info">
                            <h4>${item.course_title}</h4>
                            <p>${item.course_code}</p>
                            ${item.instructor ? `<p class="instructor">${item.instructor}</p>` : ''}
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="no-data">No classes scheduled for today</p>';
            }
        } catch (error) {
            console.error('Error loading today schedule:', error);
            document.getElementById('todaySchedule').innerHTML = '<p class="no-data">Failed to load schedule</p>';
        }
    }

    async loadRecentGrades() {
        try {
            const response = await fetch('/api/grades.php?action=recent&limit=5');
            const result = await response.json();
            
            const container = document.getElementById('recentGrades');
            
            if (result.success && result.grades.length > 0) {
                container.innerHTML = result.grades.map(grade => `
                    <div class="grade-item">
                        <div class="grade-info">
                            <h4>${grade.title}</h4>
                            <p class="course-name">${grade.course_title}</p>
                            <p class="grade-date">${formatDate(grade.grade_date)}</p>
                        </div>
                        <div class="grade-score">
                            <span class="score">${grade.percentage}%</span>
                            <span class="points">${grade.points_earned}/${grade.points_total}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="no-data">No recent grades</p>';
            }
        } catch (error) {
            console.error('Error loading recent grades:', error);
            document.getElementById('recentGrades').innerHTML = '<p class="no-data">Failed to load grades</p>';
        }
    }

    async loadProgressChart() {
        try {
            const response = await fetch('/api/grades.php?action=progress');
            const result = await response.json();
            
            const container = document.getElementById('progressChart');
            
            if (result.success && result.progress.length > 0) {
                container.innerHTML = result.progress.map(course => `
                    <div class="progress-item">
                        <div class="progress-header">
                            <span class="course-name">${course.course_title}</span>
                            <span class="progress-percentage">${course.average}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${course.average}%; background-color: ${course.color_code}"></div>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="no-data">No grade data available</p>';
            }
        } catch (error) {
            console.error('Error loading progress chart:', error);
            document.getElementById('progressChart').innerHTML = '<p class="no-data">Failed to load progress</p>';
        }
    }

    loadSectionData(sectionName) {
        switch (sectionName) {
            case 'courses':
                if (window.coursesManager) {
                    window.coursesManager.loadCourses();
                }
                break;
            case 'assignments':
                if (window.assignmentsManager) {
                    window.assignmentsManager.loadAssignments();
                }
                break;
            case 'study-sessions':
                if (window.studySessionsManager) {
                    window.studySessionsManager.loadStudySessions();
                }
                break;
            case 'grades':
                if (window.gradesManager) {
                    window.gradesManager.loadGrades();
                }
                break;
            case 'calendar':
                this.loadCalendar();
                break;
        }
    }

    loadCalendar() {
        // Simple calendar implementation
        const container = document.getElementById('calendarContainer');
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        container.innerHTML = `
            <div class="calendar-header">
                <button onclick="dashboard.previousMonth()" class="btn btn-secondary">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <h3>${new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                <button onclick="dashboard.nextMonth()" class="btn btn-secondary">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            <div class="calendar-grid">
                ${this.generateCalendarGrid(year, month)}
            </div>
        `;
    }

    generateCalendarGrid(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        let html = '<div class="calendar-weekdays">';
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        weekdays.forEach(day => {
            html += `<div class="weekday">${day}</div>`;
        });
        html += '</div><div class="calendar-days">';
        
        let currentDate = new Date(startDate);
        for (let i = 0; i < 42; i++) {
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = currentDate.toDateString() === new Date().toDateString();
            
            html += `<div class="calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${isToday ? 'today' : ''}">${currentDate.getDate()}</div>`;
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        html += '</div>';
        return html;
    }

    // Notification functions
    toggleNotifications() {
        const dropdown = document.getElementById('notificationDropdown');
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        
        if (dropdown.style.display === 'block') {
            this.loadNotifications();
        }
    }

    closeNotificationDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        dropdown.style.display = 'none';
    }

    async loadNotifications() {
        try {
            const response = await fetch('/api/notifications.php?action=list');
            const result = await response.json();
            
            const container = document.getElementById('notificationList');
            const badge = document.getElementById('notificationCount');
            
            if (result.success) {
                const unreadCount = result.notifications.filter(n => !n.is_read).length;
                badge.textContent = unreadCount;
                badge.style.display = unreadCount > 0 ? 'block' : 'none';
                
                if (result.notifications.length > 0) {
                    container.innerHTML = result.notifications.map(notification => `
                        <div class="notification-item ${notification.is_read ? '' : 'unread'}">
                            <div class="notification-content">
                                <h4>${notification.title}</h4>
                                <p>${notification.message}</p>
                                <span class="notification-time">${getRelativeTime(notification.created_at)}</span>
                            </div>
                        </div>
                    `).join('');
                } else {
                    container.innerHTML = '<p class="no-data">No notifications</p>';
                }
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    async markAllAsRead() {
        try {
            const response = await fetch('/api/notifications.php?action=markAllRead', {
                method: 'POST'
            });
            const result = await response.json();
            
            if (result.success) {
                this.loadNotifications();
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    }

    // User menu functions
    toggleUserMenu() {
        const dropdown = document.getElementById('userMenuDropdown');
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }

    closeUserMenuDropdown() {
        const dropdown = document.getElementById('userMenuDropdown');
        dropdown.style.display = 'none';
    }

    showProfile() {
        // Implementation for profile modal/page
        showAlert('Profile settings coming soon!', 'info');
    }
}

// Global functions for HTML onclick handlers
function showSection(sectionName) {
    dashboard.showSection(sectionName);
}

function toggleSidebar() {
    dashboard.toggleSidebar();
}

function toggleNotifications() {
    dashboard.toggleNotifications();
}

function markAllAsRead() {
    dashboard.markAllAsRead();
}

function toggleUserMenu() {
    dashboard.toggleUserMenu();
}

function showProfile() {
    dashboard.showProfile();
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});
