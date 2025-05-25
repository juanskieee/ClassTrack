<?php
// api/courses.php
require_once '/PHP/database.php';
require_once '/PHP/config.php';

class CoursesAPI {
    private $db;
    private $conn;

    public function __construct() {
        $this->db = new Database();
        $this->conn = $this->db->getConnection();
    }

    public function handleRequest() {
        requireLogin();
        
        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? '';

        switch ($method) {
            case 'GET':
                if ($action === 'list') {
                    $this->getCourses();
                } elseif ($action === 'count') {
                    $this->getCourseCount();
                } elseif ($action === 'today-schedule') {
                    $this->getTodaySchedule();
                } elseif ($action === 'get' && isset($_GET['id'])) {
                    $this->getCourse($_GET['id']);
                }
                break;
            case 'POST':
                if ($action === 'create') {
                    $this->createCourse();
                }
                break;
            case 'PUT':
                if ($action === 'update' && isset($_GET['id'])) {
                    $this->updateCourse($_GET['id']);
                }
                break;
            case 'DELETE':
                if ($action === 'delete' && isset($_GET['id'])) {
                    $this->deleteCourse($_GET['id']);
                }
                break;
            default:
                sendJsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        }
    }

    private function getCourses() {
        try {
            $userId = getCurrentUserId();
            $query = "SELECT * FROM courses WHERE user_id = :user_id ORDER BY course_code";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);
            sendJsonResponse(['success' => true, 'courses' => $courses]);
        } catch (Exception $e) {
            logError('Get courses error: ' . $e->getMessage());
            sendJsonResponse(['success' => false, 'message' => 'Failed to load courses'], 500);
        }
    }

    private function getCourseCount() {
        try {
            $userId = getCurrentUserId();
            $query = "SELECT COUNT(*) as count FROM courses WHERE user_id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            sendJsonResponse(['success' => true, 'count' => $result['count']]);
        } catch (Exception $e) {
            logError('Get course count error: ' . $e->getMessage());
            sendJsonResponse(['success' => false, 'message' => 'Failed to get course count'], 500);
        }
    }

    private function getTodaySchedule() {
        try {
            $userId = getCurrentUserId();
            $today = date('l'); // Full day name (Monday, Tuesday, etc.)
            
            $query = "SELECT * FROM courses WHERE user_id = :user_id AND schedule_day = :today ORDER BY time_start";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':today', $today);
            $stmt->execute();

            $schedule = $stmt->fetchAll(PDO::FETCH_ASSOC);
            sendJsonResponse(['success' => true, 'schedule' => $schedule]);
        } catch (Exception $e) {
            logError('Get today schedule error: ' . $e->getMessage());
            sendJsonResponse(['success' => false, 'message' => 'Failed to load schedule'], 500);
        }
    }

    private function getCourse($id) {
        try {
            $userId = getCurrentUserId();
            $query = "SELECT * FROM courses WHERE id = :id AND user_id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            $course = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($course) {
                sendJsonResponse(['success' => true, 'course' => $course]);
            } else {
                sendJsonResponse(['success' => false, 'message' => 'Course not found'], 404);
            }
        } catch (Exception $e) {
            logError('Get course error: ' . $e->getMessage());
            sendJsonResponse(['success' => false, 'message' => 'Failed to load course'], 500);
        }
    }

    private function createCourse() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $required = ['courseCode', 'courseTitle'];
        foreach ($required as $field) {
            if (!isset($input[$field]) || empty($input[$field])) {
                sendJsonResponse(['success' => false, 'message' => "Field $field is required"], 400);
            }
        }

        try {
            $userId = getCurrentUserId();
            
            // Check if course code already exists for this user
            $checkQuery = "SELECT id FROM courses WHERE user_id = :user_id AND course_code = :course_code";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindParam(':user_id', $userId);
            $checkStmt->bindParam(':course_code', $input['courseCode']);
            $checkStmt->execute();

            if ($checkStmt->rowCount() > 0) {
                sendJsonResponse(['success' => false, 'message' => 'Course code already exists'], 409);
            }

            $query = "INSERT INTO courses (user_id, course_code, course_title, instructor, color_code, schedule_day, time_start, time_end) 
                      VALUES (:user_id, :course_code, :course_title, :instructor, :color_code, :schedule_day, :time_start, :time_end)";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':course_code', $input['courseCode']);
            $stmt->bindParam(':course_title', $input['courseTitle']);
            $stmt->bindParam(':instructor', $input['instructor']);
            $stmt->bindParam(':color_code', $input['colorCode']);
            $stmt->bindParam(':schedule_day', $input['scheduleDay']);
            $stmt->bindParam(':time_start', $input['timeStart']);
            $stmt->bindParam(':time_end', $input['timeEnd']);

            if ($stmt->execute()) {
                sendJsonResponse(['success' => true, 'message' => 'Course created successfully']);
            } else {
                sendJsonResponse(['success' => false, 'message' => 'Failed to create course'], 500);
            }
        } catch (Exception $e) {
            logError('Create course error: ' . $e->getMessage());
            sendJsonResponse(['success' => false, 'message' => 'Failed to create course'], 500);
        }
    }

    private function updateCourse($id) {
        $input = json_decode(file_get_contents('php://input'), true);

        try {
            $userId = getCurrentUserId();

            // Check if course exists and belongs to user
            $checkQuery = "SELECT id FROM courses WHERE id = :id AND user_id = :user_id";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindParam(':id', $id);
            $checkStmt->bindParam(':user_id', $userId);
            $checkStmt->execute();

            if ($checkStmt->rowCount() === 0) {
                sendJsonResponse(['success' => false, 'message' => 'Course not found'], 404);
            }

            $query = "UPDATE courses SET course_code = :course_code, course_title = :course_title, instructor = :instructor, color_code = :color_code, schedule_day = :schedule_day, time_start = :time_start, time_end = :time_end WHERE id = :id AND user_id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':course_code', $input['courseCode']);
            $stmt->bindParam(':course_title', $input['courseTitle']);
            $stmt->bindParam(':instructor', $input['instructor']);
            $stmt->bindParam(':color_code', $input['colorCode']);
            $stmt->bindParam(':schedule_day', $input['scheduleDay']);
            $stmt->bindParam(':time_start', $input['timeStart']);
            $stmt->bindParam(':time_end', $input['timeEnd']);
            $stmt->bindParam(':id', $id);
            $stmt->bindParam(':user_id', $userId);

            if ($stmt->execute()) {
                sendJsonResponse(['success' => true, 'message' => 'Course updated successfully']);
            } else {
                sendJsonResponse(['success' => false, 'message' => 'Failed to update course'], 500);
            }
        } catch (Exception $e) {
            logError('Update course error: ' . $e->getMessage());
            sendJsonResponse(['success' => false, 'message' => 'Failed to update course'], 500);
        }
    }

    private function deleteCourse($id) {
        try {
            $userId = getCurrentUserId();

            // Check if course exists and belongs to user
            $checkQuery = "SELECT id FROM courses WHERE id = :id AND user_id = :user_id";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindParam(':id', $id);
            $checkStmt->bindParam(':user_id', $userId);
            $checkStmt->execute();

            if ($checkStmt->rowCount() === 0) {
                sendJsonResponse(['success' => false, 'message' => 'Course not found'], 404);
            }

            $query = "DELETE FROM courses WHERE id = :id AND user_id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->bindParam(':user_id', $userId);

            if ($stmt->execute()) {
                sendJsonResponse(['success' => true, 'message' => 'Course deleted successfully']);
            } else {
                sendJsonResponse(['success' => false, 'message' => 'Failed to delete course'], 500);
            }
        } catch (Exception $e) {
            logError('Delete course error: ' . $e->getMessage());
            sendJsonResponse(['success' => false, 'message' => 'Failed to delete course'], 500);
        }
    }
}

// Helper: get current user id from session
function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

// Helper: log error (implement as needed)
function logError($msg) {
    error_log($msg);
}

// Only run if called directly
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    $api = new CoursesAPI();
    $api->handleRequest();
}
