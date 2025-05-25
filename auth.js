// js/auth.js
class AuthManager {
    constructor() {
        this.baseUrl = '/api/auth.php';
        this.init();
    }

    init() {
        // Check if we're on login page
        if (document.getElementById('loginForm')) {
            this.initLoginForm();
        }
        
        // Check if we're on register page
        if (document.getElementById('registerForm')) {
            this.initRegisterForm();
        }

        // Check authentication status
        this.checkAuthStatus();
    }

    initLoginForm() {
        const form = document.getElementById('loginForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    }

    initRegisterForm() {
        const form = document.getElementById('registerForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Password confirmation validation
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        
        confirmPassword.addEventListener('input', () => {
            if (password.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Passwords do not match');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });
    }

    async handleLogin() {
        const form = document.getElementById('loginForm');
        const formData = new FormData(form);
        
        const loginData = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        try {
            showLoading('Signing in...');
            
            const response = await fetch(`${this.baseUrl}?action=login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData)
            });

            const result = await response.json();
            hideLoading();

            if (result.success) {
                // Store user data
                localStorage.setItem('user', JSON.stringify(result.user));
                if (result.token) {
                    localStorage.setItem('token', result.token);
                }
                
                showAlert('Login successful! Redirecting...', 'success');
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = '/HTML/dashboard.html';
                }, 1500);
            } else {
                showAlert(result.message || 'Login failed', 'error');
            }
        } catch (error) {
            hideLoading();
            console.error('Login error:', error);
            showAlert('Login failed. Please try again.', 'error');
        }
    }

    async handleRegister() {
        const form = document.getElementById('registerForm');
        const formData = new FormData(form);
        
        // Validate passwords match
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        
        if (password !== confirmPassword) {
            showAlert('Passwords do not match', 'error');
            return;
        }

        const registerData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            username: formData.get('username'),
            program: formData.get('program'),
            yearLevel: formData.get('yearLevel'),
            password: password
        };

        try {
            showLoading('Creating account...');
            
            const response = await fetch(`${this.baseUrl}?action=register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(registerData)
            });

            const result = await response.json();
            hideLoading();

            if (result.success) {
                showAlert('Registration successful! You can now sign in.', 'success');
                
                // Redirect to login page
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 2000);
            } else {
                showAlert(result.message || 'Registration failed', 'error');
            }
        } catch (error) {
            hideLoading();
            console.error('Registration error:', error);
            showAlert('Registration failed. Please try again.', 'error');
        }
    }

    async checkAuthStatus() {
        // Skip auth check on login/register pages
        if (window.location.pathname.includes('index.html') || 
            window.location.pathname.includes('register.html') ||
            window.location.pathname === '/') {
            return;
        }

        try {
            const response = await fetch(`${this.baseUrl}?action=check`);
            const result = await response.json();

            if (!result.authenticated) {
                // Redirect to login if not authenticated
                window.location.href = '/index.html';
                return;
            }

            // Store/update user data
            if (result.user) {
                localStorage.setItem('user', JSON.stringify(result.user));
                this.updateUserDisplay(result.user);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            // Redirect to login on error
            window.location.href = '/index.html';
        }
    }

    updateUserDisplay(user) {
        // Update user name in sidebar
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = `${user.first_name} ${user.last_name}`;
        }

        // Update page title with user name
        const pageSubtitle = document.getElementById('pageSubtitle');
        if (pageSubtitle && pageSubtitle.textContent.includes('Welcome back')) {
            pageSubtitle.textContent = `Welcome back, ${user.first_name}! Here's your academic overview.`;
        }
    }

    async logout() {
        try {
            showLoading('Signing out...');
            
            const response = await fetch(`${this.baseUrl}?action=logout`, {
                method: 'POST'
            });

            const result = await response.json();
            
            // Clear local storage
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            
            hideLoading();
            showAlert('Logged out successfully', 'success');
            
            // Redirect to login
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1000);
        } catch (error) {
            hideLoading();
            console.error('Logout error:', error);
            
            // Force redirect even on error
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = '/index.html';
        }
    }

    getCurrentUser() {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }

    isAuthenticated() {
        return this.getCurrentUser() !== null;
    }
}

// Password toggle functionality
function togglePassword(fieldId = 'password') {
    const passwordField = document.getElementById(fieldId);
    const toggleIcon = fieldId === 'password' ? document.getElementById('toggleIcon') : 
                      fieldId === 'confirmPassword' ? document.getElementById('toggleIcon2') :
                      document.getElementById('toggleIcon1');
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordField.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

// Global auth instance
const auth = new AuthManager();

// Global logout function for buttons
function logout() {
    auth.logout();
}