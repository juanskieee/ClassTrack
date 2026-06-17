# ClassTrack: Student-Focused Task Management System

> A web-based task management system designed specifically for students to organize assignments, manage deadlines, monitor grades, and schedule study sessions.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![PHP](https://img.shields.io/badge/PHP-777BB4?style=flat&logo=php&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white)

---

## Overview

As academic workloads increase, students need effective tools to manage their schedules. ClassTrack provides a centralized platform to handle the essential aspects of student life. This project also serves as a comparative study between PHP and Java backend architectures, exploring the strengths, weaknesses, and performance implications of both in an academic software development context.

### Core Features

- **Course Management** — Organize subjects, instructors, and class schedules.
- **Assignment Tracking** — Manage tasks with priority levels, status updates, and deadlines.
- **Study Planning** — Schedule study sessions and track productivity.
- **Grade Management** — Record grades, calculate weighted averages, and predict final outcomes.
- **Notification System** — Automated reminders for upcoming deadlines and classes.

---

## Technical Implementation

### Front-End

| Technology | Usage |
|---|---|
| HTML5 | Markup and structure |
| CSS3 | Responsive styling and dashboard layout |
| JavaScript | Interactivity and AJAX for real-time updates |

The interface uses AJAX for real-time data updates (dashboard stats, notifications) without full page reloads.

### Back-End Implementations

This project is built with a shared front-end and two distinct back-end implementations for direct comparison.

**1. PHP Implementation**
- Architecture: LAMP stack (Linux, Apache, MySQL, PHP)
- Approach: Native PHP without frameworks, using direct MySQL connectivity via `MySQLi`
- Key Strengths: Rapid development and seamless HTML/database integration

**2. Java Implementation**
- Architecture: Apache Tomcat (Servlet Container) with MySQL
- Approach: Classical MVC design using Java Servlets (Controllers), JSP (Views), and Java Beans (Models)
- Database Connectivity: JDBC with connection pooling
- Key Strengths: Strong type safety, better performance for computation-heavy tasks, and superior handling of concurrent sessions

---

## Database Schema

The system uses a relational MySQL database with the following core tables:

| Table | Purpose |
|---|---|
| `users` | Authentication and profile information |
| `courses` | Course details, instructor info, and scheduling |
| `assignments` | Task management data linked to courses |
| `grades` | Performance tracking and analysis |
| `study_sessions` | Planning and tracking academic time |
| `notifications` | Real-time alerts for the user |

---

## Project Structure

```
/
├── HTML/               # Front-end views (dashboard, registration)
├── JS/                 # JavaScript logic for auth, dashboard, and utilities
├── PHP/                # Server-side API endpoints for data and authentication
└── database_schema.sql # Complete SQL schema for environment setup
```

---

## Credits

Developed by **Juan Carlos Garcia** for COSC 95 - Programming Languages.
