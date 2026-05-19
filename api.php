<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

$host = "localhost";
$username = "root";
$password = "";
$dbname = "notized_db";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Koneksi database gagal: " . $e->getMessage()]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$action = $_GET['action'] ?? '';

if ($action === 'get_tree') {
    $email = $_GET['email'] ?? '';
    if (!$email) {
        echo json_encode([]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT tree_data FROM library_tree WHERE user_email = ?");
    $stmt->execute([$email]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    echo $row ? $row['tree_data'] : json_encode([]);
    exit;
}

// ─── SIMPAN/UPDATE DATA TREE PER USER ───
if ($action === 'save_tree') {
    $email = $input['email'] ?? '';
    $treeData = json_encode($input['tree_data'] ?? []);

    if (!$email) {
        echo json_encode(["status" => "error", "message" => "Email tidak valid."]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id FROM library_tree WHERE user_email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->fetch()) {
        $updateStmt = $pdo->prepare("UPDATE library_tree SET tree_data = ? WHERE user_email = ?");
        $updateStmt->execute([$treeData, $email]);
    } else {
        $insertStmt = $pdo->prepare("INSERT INTO library_tree (user_email, tree_data) VALUES (?, ?)");
        $insertStmt->execute([$email, $treeData]);
    }

    echo json_encode(["status" => "success", "message" => "Database MySQL sukses terupdate!"]);
    exit;
}

// ─── 📝 FEATURE: REGISTRASI USER BARU (SIGN UP) ───
if ($action === 'register') {
    $name = $input['name'] ?? '';
    $email = trim(strtolower($input['email'] ?? ''));
    $password = $input['password'] ?? '';

    if (!$name || !$email || !$password) {
        echo json_encode(["status" => "error", "message" => "Semua data wajib diisi!"]);
        exit;
    }

    // Cek apakah email sudah pernah terdaftar di tabel users
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo json_encode(["status" => "error", "message" => "Email ini sudah terdaftar! Silakan langsung Log In."]);
        exit;
    }

    // Masukkan data user baru ke tabel users
    $insertStmt = $pdo->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
    $insertStmt->execute([$name, $email, $password]);

    echo json_encode(["status" => "success", "message" => "Akun berhasil dibuat!"]);
    exit;
}

// ─── 🔑 FEATURE: AUTENTIKASI LOGIN USER ───
if ($action === 'login') {
    $email = trim(strtolower($input['email'] ?? ''));
    $password = $input['password'] ?? '';

    if (!$email || !$password) {
        echo json_encode(["status" => "error", "message" => "Email dan password wajib diisi!"]);
        exit;
    }

    // Cari user berdasarkan email
    $stmt = $pdo->prepare("SELECT name, email, password FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(["status" => "error", "message" => "Email belum terdaftar! Silakan buat akun dulu."]);
        exit;
    }

    if ($user['password'] !== $password) {
        echo json_encode(["status" => "error", "message" => "Password salah! Silakan coba lagi."]);
        exit;
    }

    echo json_encode([
        "status" => "success",
        "user" => [
            "name" => $user['name'],
            "email" => $user['email']
        ]
    ]);
    exit;
}
?>