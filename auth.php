<?php
// api/auth.php
require_once '../config/database.php';
require_once '../config/config.php';

class AuthAPI {
    private $db;
    private $conn;

    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->getConnection();
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? '';

        switch ($method) {
            case 'POST':
                if ($action === 'login') {
                    $this->login();
                } elseif ($action === 'register') {
                    $this->register();
                } elseif ($action === 'logout') {
                    $this->logout();
                }
                break;
            case 'GET':
                if ($action === 'check') {
                    $this->checkAuth();
                } elseif ($action === 'profile') {
                    $this->getProfile();
                }
                break;
            default:
                sendJsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        }
    }

    private function login() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['username']) || !isset($input['password'])) {
            sendJsonResponse(['success' => false, 'message' => 'Username and password required'], 400);
        }

        $username = sanitizeInput($input['username']);
        $password = $input['password'];

        try {
            $query = "SELECT id, username, email, password_hash, first_name, last_name, program, year_level 
                     FROM users WHERE (username = :username OR email = :username) AND is_active = 1";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':username', $username);
            $stmt->execute();

            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && verifyPassword($password, $user['password_hash'])) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];

                // Create user session
                $token = generateToken();
                $expires = date('Y-m-d H:i:s', strtotime('+30 days'));
                
                $sessionQuery = "INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (:user_id, :token, :expires)";
                $sessionStmt = $this->conn->prepare($sessionQuery);
                $sessionStmt->bindParam(':user_id', $user['id']);
                $sessionStmt->bindParam(':token', $token);
                $sessionStmt->bindParam(':expires', $expires);
                $sessionStmt->execute();

                unset($user['password_hash']);
                sendJsonResponse([
                    'success' => true, 
                    'message' => 'Login successful',
                    'user' => $user,
                    'token' => $token
                ]);
            } else {
                sendJsonResponse(['success' => false, 'message' => 'Invalid credentials'], 401);
            }
        } catch (Exception $e) {
            logError('Login error: ' . $e->getMessage());
            sendJsonResponse(['success' => false, 'message' => 'Login failed'], 500);
        }
    }

    private function register() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $required = ['username', 'email', 'password', 'firstName', 'lastName', 'program', 'yearLevel'];
        foreach ($required as $field) {
            if (!isset($input[$field]) || empty($input[$field])) {
                sendJsonResponse(['success' => false, 'message' => "Field $field is required"], 400);
            }
        }

        $username = sanitizeInput($input['username']);
        $email = sanitizeInput($input['email']);
        $password = $input['password'];
        $firstName = sanitizeInput($input['firstName']);
        $lastName = sanitizeInput($input['lastName']);
        $program = sanitizeInput($input['program']);
        $yearLevel = sanitizeInput($input['yearLevel']);

        if (!validateEmail($email)) {
            sendJsonResponse(['success' => false, 'message' => 'Invalid email format'], 400);
        }

        if (strlen($password) < 6) {
            sendJsonResponse(['success' => false, 'message' => 'Password must be at least 6 characters'], 400);
        }

        try {
            // Check if username or email already exists
            $checkQuery = "SELECT id FROM users WHERE username = :username OR email = :email";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindParam(':username', $username);
            $checkStmt->bindParam(':email', $email);
            $checkStmt->execute();

            if ($checkStmt->rowCount() > 0) {
                sendJsonResponse(['success' => false, 'message' => 'Username or email already exists'], 409);
            }

            // Create new user
            $passwordHash = hashPassword($password);
            $query = "INSERT INTO users (username, email, password_hash, first_name, last_name, program, year_level) 
                     VALUES (:username, :email, :password_hash, :first_name, :last_name, :program, :year_level)";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':username', $username);
            $stmt->bindParam(':email', $email);
            $stmt->bindParam(':password_hash', $passwordHash);
            $stmt->bindParam(':first_name', $firstName);
            $stmt->bindParam(':last_name', $lastName);
            $stmt->bindParam(':program', $program);
            $stmt->bindParam(':year_level', $yearLevel);
            
            if ($stmt->execute()) {
                $userId = $this->conn->lastInsertId();
                
                // Create welcome notification
                $notifQuery = "INSERT INTO notifications (user_id, title, message, type) VALUES (:user_id, :title, :message, 'general')";
                $notifStmt = $this->conn->prepare($notifQuery);
                $title = "Welcome to ClassTrack!";
                $message = "Welcome to ClassTrack! Start by adding your courses and assignments to stay organized.";
                $notifStmt->bindParam(':user_id', $userId);
                $notifStmt->bindParam(':title', $title);
                $notifStmt->bindParam(':message', $message);
                $notifStmt->execute();

                sendJsonResponse(['success' => true, 'message' => 'Registration successful']);
            } else {
                sendJsonResponse(['success' => false, 'message' => 'Registration failed'], 500);
            }
        } catch (Exception $e) {
            logError('Registration error: ' . $e->getMessage());
            sendJsonResponse(['success' => false, 'message' => 'Registration failed'], 500);
        }
    }

    private function logout() {
        if (isset($_SESSION['user_id'])) {
            // Delete user sessions
            $query = "DELETE FROM user_sessions WHERE user_id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $_SESSION['user_id']);
            $stmt->execute();
        }

        session_destroy();
        sendJsonResponse(['success' => true, 'message' => 'Logout successful']);
    }

    private function checkAuth() {
        if (isLoggedIn()) {
            $query = "SELECT id, username, first_name, last_name, email, program, year_level FROM users WHERE id = :id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $_SESSION['user_id']);
            $stmt->execute();
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            sendJsonResponse(['success' => true, 'authenticated' => true, 'user' => $user]);
        } else {
            sendJsonResponse(['success' => true, 'authenticated' => false]);
        }
    }

    private function getProfile() {
        requireLogin();
        
        $query = "SELECT id, username, first_name, last_name, email, program, year_level, created_at FROM users WHERE id = :id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', getCurrentUserId());
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        sendJsonResponse(['success' => true, 'user' => $user]);
    }
}

$api = new AuthAPI();
$api->handleRequest();
?>