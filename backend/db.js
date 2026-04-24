const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

async function initDb() {
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'database.sqlite');
    
    // Đảm bảo thư mục chứa file database tồn tại
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT
        );

        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT UNIQUE,
            name TEXT,
            email TEXT,
            class_name TEXT
        );

        CREATE TABLE IF NOT EXISTS grades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            subject TEXT,
            tx1 REAL,
            tx2 REAL,
            tx3 REAL,
            tx4 REAL,
            tx5 REAL,
            gk REAL,
            ck REAL,
            score REAL,
            semester TEXT,
            hash TEXT,
            FOREIGN KEY (student_id) REFERENCES students(student_id)
        );

        CREATE TABLE IF NOT EXISTS certificates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            cert_name TEXT,
            issue_date TEXT,
            hash TEXT,
            FOREIGN KEY (student_id) REFERENCES students(student_id)
        );

        CREATE TABLE IF NOT EXISTS blockchain_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data_hash TEXT UNIQUE,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS revocations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data_hash TEXT UNIQUE,
            reason TEXT,
            revoked_by TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_name TEXT UNIQUE
        );

        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_name TEXT UNIQUE
        );

        CREATE TABLE IF NOT EXISTS academic_years (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year_name TEXT UNIQUE
        );
    `);

    // Removed initial demo seeding as requested

    // Schema updates for Authenticity pillar (RSA Signatures)
    try { await db.exec("ALTER TABLE grades ADD COLUMN signature TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE grades ADD COLUMN semester TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE grades ADD COLUMN academic_year TEXT"); } catch (e) {}
    try { await db.exec("ALTER TABLE certificates ADD COLUMN signature TEXT"); } catch (e) {}


    // Default Admin
    const admin = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
    if (!admin) {
        // Trực tiếp cho demo ngắn ngọn (mật khẩu k hash cũng được dùng cho dễ demo, nhưng để chuẩn theo yêu cầu:
        await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', 'admin123', 'admin']);
    }

    // Default Student User
    const student = await db.get('SELECT * FROM users WHERE username = ?', ['student']);
    if (!student) {
        await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['student', 'student123', 'student']);
    }

    return db;
}

module.exports = { initDb };
