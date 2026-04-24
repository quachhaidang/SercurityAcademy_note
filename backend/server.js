require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { initDb } = require('./db');
const BlockchainService = require('./BlockchainService');
const HashService = require('./HashService');
const KeyService = require('./KeyService');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// app.use(express.static('frontend')); // Frontend is now a separate React app

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || "dummy_secret_for_demo";

let db;
let bcm;

// Add a simple health check or protection for db
// This MUST be before routes to protect them
app.use((req, res, next) => {
    if (!db && req.path.startsWith('/api') && req.path !== '/api/auth/login') { // Allow login if possible? No, login needs db too.
        if (req.path.startsWith('/api')) {
            return res.status(503).json({ error: "Hệ thống đang khởi tạo dữ liệu, vui lòng thử lại sau giây lát." });
        }
    }
    next();
});

const calculateGPA = (g) => {
    let txSum = 0; let txCount = 0;
    ['tx1', 'tx2', 'tx3', 'tx4', 'tx5'].forEach(k => {
        const v = parseFloat(g[k]);
        if (!isNaN(v)) { txSum += v; txCount++; }
    });
    const gk = parseFloat(g.gk);
    const ck = parseFloat(g.ck);
    let totalWeight = txCount;
    let totalScore = txSum;

    if (!isNaN(gk)) { totalScore += gk * 2; totalWeight += 2; }
    if (!isNaN(ck)) { totalScore += ck * 3; totalWeight += 3; }

    return totalWeight > 0 ? (totalScore / totalWeight).toFixed(1) : '0.0';
};

const getGradeDataString = (g) => {
    const f = (v) => (v != null && v !== '') ? parseFloat(v).toFixed(1) : '';
    const score = calculateGPA(g);
    const sem = g.semester || '';
    const year = g.academic_year || '';
    return `${g.student_id}-${g.subject}-${year}-${sem}-${f(g.tx1)}-${f(g.tx2)}-${f(g.tx3)}-${f(g.tx4)}-${f(g.tx5)}-${f(g.gk)}-${f(g.ck)}-${score}`;
};

// =======================
// AUTH MIDDLEWARE
// =======================
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
        const decoded = jwt.verify(token.split(" ")[1], SECRET_KEY);
        req.user = decoded;
        next();
    } catch {
        res.status(403).json({ error: "Forbidden" });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Requires Admin Role" });
    next();
};

const requireStaff = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') return res.status(403).json({ error: "Requires Staff or Admin Role" });
    next();
};

// =======================
// API: PUBLIC LOOKUP & VERIFY
// =======================
app.get('/api/public/config', (req, res) => {
    res.json({
        issuer: "Security Academy",
        publicKey: KeyService.getPublicKey()
    });
});

app.post('/api/public/verify', async (req, res) => {
    const { dataString, signature, hash } = req.body;
    if (!dataString || !signature || !hash) return res.status(400).json({ error: "Missing payload" });

    // 1. Authenticity
    const sigValid = KeyService.verifySignature(dataString, signature);
    
    // 2. Integrity 
    const onChainStatus = await bcm.verifyHash(dataString);

    // 3. Revocation check
    const revocationRecord = await bcm.isRevoked(hash);

    // 4. Extract true metadata
    const grade = await db.get('SELECT * FROM grades WHERE hash = ?', [hash]);
    const cert = await db.get('SELECT * FROM certificates WHERE hash = ?', [hash]);
    
    let trueStudentName = "Unknown";
    let trueClassName = "Unknown";
    let student_id = "Unknown";
    let recordName = "Unknown";

    if (grade) {
        student_id = grade.student_id;
        recordName = grade.subject;
    } else if (cert) {
        student_id = cert.student_id;
        recordName = cert.cert_name;
    }

    if (student_id !== "Unknown") {
        const student = await db.get('SELECT name, class_name FROM students WHERE student_id = ?', [student_id]);
        if (student) {
            trueStudentName = student.name;
            trueClassName = student.class_name;
        }
    }

    res.json({ 
        authenticityValid: sigValid,
        integrityValid: onChainStatus === 'Valid',
        isRevoked: !!revocationRecord,
        revocationInfo: revocationRecord ? {
            reason: revocationRecord.reason,
            revokedBy: revocationRecord.revoked_by,
            timestamp: revocationRecord.timestamp
        } : null,
        issuerMetadata: {
            name: "Security Academy",
            publicKey: KeyService.getPublicKey().substring(0, 64) + '...',
            website: "https://security.academy",
            country: "Vietnam"
        },
        trueData: {
            studentName: trueStudentName,
            className: trueClassName,
            studentId: student_id,
            recordName: recordName
        }
    });
});

// =======================
// API: BLOCKCHAIN EXPLORER
// =======================
app.get('/api/public/explorer', async (req, res) => {
    try {
        const logs = await bcm.getLatestLogs(50);
        const stats = await bcm.getStats();
        res.json({ logs, stats });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi tải dữ liệu explorer' });
    }
});

// =======================
// API: REVOCATION (Admin only)
// =======================
app.post('/api/admin/revoke', authenticate, requireAdmin, async (req, res) => {
    const { hash, reason } = req.body;
    if (!hash || !reason) return res.status(400).json({ error: 'Cần cung cấp hash và lý do thu hồi' });
    try {
        const result = await bcm.revokeHash(hash, reason, req.user.username);
        if (result.alreadyRevoked) return res.status(409).json({ error: 'Bản ghi này đã bị thu hồi trước đó' });
        res.json({ message: 'Đã thu hồi thành công trên Blockchain', hash });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi thu hồi bản ghi' });
    }
});

app.get('/api/public/lookup/:student_id', async (req, res) => {
    const student_id = req.params.student_id.toUpperCase().replace(/-/g, '');
    const student = await db.get('SELECT name, class_name FROM students WHERE student_id = ?', [student_id]);
    
    if (!student) return res.status(404).json({ error: "Không tìm thấy sinh viên" });
    
    const grades = await db.all('SELECT subject, semester, tx1, tx2, tx3, tx4, tx5, gk, ck, score, signature, hash FROM grades WHERE student_id = ?', [student_id]);
    const certs = await db.all('SELECT cert_name, issue_date, signature, hash FROM certificates WHERE student_id = ?', [student_id]);
    
    let isValid = true;
    
    const verifiedGrades = await Promise.all(grades.map(async (g) => {
        const dataString = getGradeDataString({ student_id, ...g });
        const hashStatus = await bcm.verifyHash(dataString);
        const sigStatus = KeyService.verifySignature(dataString, g.signature);
        const revoked = await bcm.isRevoked(g.hash);
        const status = (hashStatus === 'Valid' && sigStatus && !revoked) ? 'Valid' : (revoked ? 'Revoked' : 'Tampered');
        if (status !== 'Valid') isValid = false;
        return { ...g, dataString, blockchainStatus: status, signatureVerified: sigStatus, isRevoked: !!revoked };
    }));

    const verifiedCerts = await Promise.all(certs.map(async (c) => {
        const dataString = `${student_id}-${c.cert_name}-${c.issue_date}`;
        const hashStatus = await bcm.verifyHash(dataString);
        const sigStatus = KeyService.verifySignature(dataString, c.signature);
        const revoked = await bcm.isRevoked(c.hash);
        const status = (hashStatus === 'Valid' && sigStatus && !revoked) ? 'Valid' : (revoked ? 'Revoked' : 'Tampered');
        if (status !== 'Valid') isValid = false;
        return { ...c, dataString, blockchainStatus: status, signatureVerified: sigStatus, isRevoked: !!revoked };
    }));

    console.log(`Lookup for ${student_id}: Found ${verifiedGrades.length} grades, ${verifiedCerts.length} certs. Overall Valid: ${isValid}`);

    res.json({
        student_id: student_id,
        name: student.name,
        class_name: student.class_name,
        record_count: verifiedGrades.length + verifiedCerts.length,
        blockchain_verified: isValid,
        grades: verifiedGrades,
        certs: verifiedCerts
    });
});

// =======================
// API: AUTHENTICATION
// =======================
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    if (!user) return res.status(401).json({ error: "Sai thông tin đăng nhập." });
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY);
    res.json({ token, role: user.role, username: user.username });
});

app.post('/api/users/teacher', authenticate, requireAdmin, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Vui lòng nhập đủ thông tin." });
    
    try {
        const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUser) return res.status(400).json({ error: "Tên đăng nhập đã tồn tại." });
        
        await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, password, 'teacher']);
        res.status(201).json({ message: "Tạo tài khoản giáo viên thành công!" });
    } catch (err) {
        res.status(500).json({ error: "Lỗi tạo tài khoản." });
    }
});

// =======================
// API: STUDENTS (Admin)
// =======================
app.get('/api/students', authenticate, async (req, res) => {
    const students = await db.all('SELECT * FROM students');
    res.json(students);
});

app.post('/api/students', authenticate, requireAdmin, async (req, res) => {
    const { student_id, name, email, class_name } = req.body;
    try {
        await db.run('INSERT INTO students (student_id, name, email, class_name) VALUES (?, ?, ?, ?)', 
            [student_id, name, email, class_name]);
        res.json({ message: "Student added" });
    } catch (err) {
        res.status(400).json({ error: "Student ID must be unique" });
    }
});

app.post('/api/students/bulk', authenticate, requireAdmin, async (req, res) => {
    const { students } = req.body;
    if (!Array.isArray(students)) return res.status(400).json({ error: "Invalid data format" });

    let importedStudents = [];
    let errors = [];

    await db.run('BEGIN TRANSACTION');
    try {
        for (const s of students) {
            try {
                await db.run('INSERT INTO students (student_id, name, email, class_name) VALUES (?, ?, ?, ?)', 
                    [s.student_id, s.name, s.email, s.class_name]);
                importedStudents.push(s);
            } catch (err) {
                errors.push(`ID ${s.student_id} đã tồn tại hoặc không hợp lệ.`);
            }
        }
        await db.run('COMMIT');
        res.json({ message: `Đã nhập ${importedStudents.length} sinh viên`, importedStudents, errors });
    } catch (err) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: "Bulk import failed" });
    }
});

// DELETE single student
app.delete('/api/students/:id', authenticate, requireAdmin, async (req, res) => {
    const { id } = req.params;
    await db.run('BEGIN TRANSACTION');
    try {
        await db.run('DELETE FROM certificates WHERE student_id = ?', [id]);
        await db.run('DELETE FROM grades WHERE student_id = ?', [id]);
        const result = await db.run('DELETE FROM students WHERE student_id = ?', [id]);
        await db.run('COMMIT');
        if (result.changes === 0) return res.status(404).json({ error: 'Sinh viên không tồn tại.' });
        res.json({ message: `Đã xóa sinh viên ${id}` });
    } catch (err) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: 'Lỗi khi xóa sinh viên.' });
    }
});

// UPDATE single student
app.put('/api/students/:id', authenticate, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, email, class_name } = req.body;
    try {
        const result = await db.run(
            'UPDATE students SET name = ?, email = ?, class_name = ? WHERE student_id = ?',
            [name, email, class_name, id]
        );
        if (result.changes === 0) return res.status(404).json({ error: 'Sinh viên không tồn tại.' });
        res.json({ message: 'Cập nhật thành công.' });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi cập nhật sinh viên.' });
    }
});

app.delete('/api/students/all', authenticate, requireAdmin, async (req, res) => {
    await db.run('BEGIN TRANSACTION');
    try {
        await db.run('DELETE FROM certificates');
        await db.run('DELETE FROM grades');
        await db.run('DELETE FROM students');
        await db.run('COMMIT');
        res.json({ message: "Đã xóa toàn bộ sinh viên và dữ liệu liên quan." });
    } catch (err) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: "Không thể xóa toàn bộ sinh viên." });
    }
});

app.post('/api/students/delete-bulk', authenticate, requireAdmin, async (req, res) => {
    const { studentIds } = req.body;
    if (!Array.isArray(studentIds)) return res.status(400).json({ error: "Dữ liệu không hợp lệ." });

    await db.run('BEGIN TRANSACTION');
    try {
        const placeholders = studentIds.map(() => '?').join(',');
        await db.run(`DELETE FROM certificates WHERE student_id IN (${placeholders})`, studentIds);
        await db.run(`DELETE FROM grades WHERE student_id IN (${placeholders})`, studentIds);
        await db.run(`DELETE FROM students WHERE student_id IN (${placeholders})`, studentIds);
        await db.run('COMMIT');
        res.json({ message: `Đã xóa ${studentIds.length} sinh viên.` });
    } catch (err) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: "Lỗi khi xóa sinh viên hàng loạt." });
    }
});

// =======================
// API: GRADES
// =======================
app.get('/api/grades', authenticate, async (req, res) => {
    const grades = await db.all('SELECT * FROM grades');
    // Verify blockchain integrity for each grade
    for (let g of grades) {
        const dataString = getGradeDataString(g);
        const hashStatus = await bcm.verifyHash(dataString);
        const sigStatus = KeyService.verifySignature(dataString, g.signature);
        g.blockchainStatus = (hashStatus === 'Valid' && sigStatus) ? 'Valid' : 'Tampered';
        g.signatureVerified = sigStatus;
    }
    res.json(grades);
});

app.post('/api/grades', authenticate, requireStaff, async (req, res) => {
    const { student_id, subject, semester, academic_year, tx1, tx2, tx3, tx4, tx5, gk, ck } = req.body;
    
    // Auto-calculate score on backend to ensure integrity
    const score = calculateGPA({ tx1, tx2, tx3, tx4, tx5, gk, ck });
    
    const dataString = getGradeDataString({ student_id, subject, semester, academic_year, tx1, tx2, tx3, tx4, tx5, gk, ck });
    
    // Hash and store to Mock Blockchain
    const hash = await bcm.saveHash(dataString);
    const signature = KeyService.signData(dataString);

    // Save actual data to traditional database
    const existing = await db.get('SELECT id FROM grades WHERE student_id = ? AND subject = ? AND semester = ? AND academic_year = ?', [student_id, subject, semester, academic_year]);
    if (existing) {
        await db.run('UPDATE grades SET score = ?, hash = ?, signature = ?, tx1 = ?, tx2 = ?, tx3 = ?, tx4 = ?, tx5 = ?, gk = ?, ck = ? WHERE id = ?', 
            [score, hash, signature, tx1, tx2, tx3, tx4, tx5, gk, ck, existing.id]);
    } else {
        await db.run('INSERT INTO grades (student_id, subject, semester, academic_year, score, hash, signature, tx1, tx2, tx3, tx4, tx5, gk, ck) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
            [student_id, subject, semester, academic_year, score, hash, signature, tx1, tx2, tx3, tx4, tx5, gk, ck]);
    }
    
    res.json({ message: "Grade added/updated and saved to Blockchain", hash, calculatedScore: score });
});

// =======================
// API: CERTIFICATES
// =======================
app.get('/api/certificates', authenticate, async (req, res) => {
    const certs = await db.all('SELECT * FROM certificates');
    for (let c of certs) {
        const dataString = `${c.student_id}-${c.cert_name}-${c.issue_date}`;
        const hashStatus = await bcm.verifyHash(dataString);
        const sigStatus = KeyService.verifySignature(dataString, c.signature);
        // Check revocation
        const revoked = await db.get('SELECT * FROM revocations WHERE data_hash = ?', [c.hash]);
        c.isRevoked = !!revoked;
        c.revocationInfo = revoked || null;
        c.blockchainStatus = c.isRevoked ? 'Revoked' : (hashStatus === 'Valid' && sigStatus) ? 'Valid' : 'Tampered';
        c.signatureVerified = sigStatus;
    }
    res.json(certs);
});

app.post('/api/certificates', authenticate, requireAdmin, async (req, res) => {
    const { student_id, cert_name, issue_date } = req.body;
    const dataString = `${student_id}-${cert_name}-${issue_date}`;
    
    const hash = await bcm.saveHash(dataString);
    const signature = KeyService.signData(dataString);

    await db.run('INSERT INTO certificates (student_id, cert_name, issue_date, hash, signature) VALUES (?, ?, ?, ?, ?)', 
        [student_id, cert_name, issue_date, hash, signature]);
    
    res.json({ message: "Certificate issued and hashed on Blockchain", hash });
});

app.delete('/api/certificates/:id', authenticate, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.run('DELETE FROM certificates WHERE id = ?', [id]);
        if (result.changes === 0) return res.status(404).json({ error: 'Chứng chỉ không tồn tại.' });
        res.json({ message: `Đã xóa chứng chỉ #${id} khỏi hệ thống.` });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi xóa chứng chỉ.' });
    }
});

// =======================
// API: CLASSES & SUBJECTS (Admin Catalog)
// =======================
app.get('/api/classes', authenticate, async (req, res) => {
    const classes = await db.all('SELECT * FROM classes');
    res.json(classes);
});

app.post('/api/classes', authenticate, requireAdmin, async (req, res) => {
    const { class_name } = req.body;
    try {
        await db.run('INSERT INTO classes (class_name) VALUES (?)', [class_name]);
        res.json({ message: "Đã thêm lớp" });
    } catch {
        res.status(400).json({ error: "Lớp học đã tồn tại" });
    }
});

app.put('/api/classes/:id', authenticate, requireAdmin, async (req, res) => {
    const { class_name } = req.body;
    try {
        await db.run('UPDATE classes SET class_name = ? WHERE id = ?', [class_name, req.params.id]);
        res.json({ message: "Đã cập nhật lớp" });
    } catch {
        res.status(400).json({ error: "Lỗi cập nhật hoặc tên trùng lặp" });
    }
});

app.delete('/api/classes/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        // Prevent deletion if students exist in this class
        const c = await db.get('SELECT class_name FROM classes WHERE id = ?', [req.params.id]);
        if(c) {
            const stu = await db.get('SELECT COUNT(*) as cnt FROM students WHERE class_name = ?', [c.class_name]);
            if(stu.cnt > 0) return res.status(400).json({ error: "Không thể xóa lớp đang có học sinh" });
        }
        await db.run('DELETE FROM classes WHERE id = ?', [req.params.id]);
        res.json({ message: "Đã xóa lớp" });
    } catch {
        res.status(500).json({ error: "Lỗi xóa lớp" });
    }
});

app.get('/api/subjects', authenticate, async (req, res) => {
    const subjects = await db.all('SELECT * FROM subjects');
    res.json(subjects);
});

app.get('/api/academic-years', authenticate, async (req, res) => {
    const years = await db.all('SELECT * FROM academic_years ORDER BY year_name DESC');
    res.json(years);
});

app.post('/api/academic-years', authenticate, requireAdmin, async (req, res) => {
    const { year_name } = req.body;
    try {
        await db.run('INSERT INTO academic_years (year_name) VALUES (?)', [year_name]);
        res.json({ message: "Đã thêm năm học mới" });
    } catch (err) {
        res.status(400).json({ error: "Năm học đã tồn tại" });
    }
});

app.delete('/api/academic-years/:id', authenticate, requireAdmin, async (req, res) => {
    const { id } = req.params;
    await db.run('DELETE FROM academic_years WHERE id = ?', [id]);
    res.json({ message: "Đã xóa năm học" });
});

app.post('/api/subjects', authenticate, requireAdmin, async (req, res) => {
    const { subject_name } = req.body;
    try {
        await db.run('INSERT INTO subjects (subject_name) VALUES (?)', [subject_name]);
        res.json({ message: "Đã thêm môn học" });
    } catch {
        res.status(400).json({ error: "Môn học đã tồn tại" });
    }
});

app.put('/api/subjects/:id', authenticate, requireAdmin, async (req, res) => {
    const { subject_name } = req.body;
    try {
        await db.run('UPDATE subjects SET subject_name = ? WHERE id = ?', [subject_name, req.params.id]);
        res.json({ message: "Đã cập nhật môn học" });
    } catch {
        res.status(400).json({ error: "Lỗi cập nhật hoặc tên trùng lặp" });
    }
});

app.delete('/api/subjects/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const s = await db.get('SELECT subject_name FROM subjects WHERE id = ?', [req.params.id]);
        if(s) {
            const grd = await db.get('SELECT COUNT(*) as cnt FROM grades WHERE subject = ?', [s.subject_name]);
            if(grd.cnt > 0) return res.status(400).json({ error: "Không thể xóa môn học đã có điểm" });
        }
        await db.run('DELETE FROM subjects WHERE id = ?', [req.params.id]);
        res.json({ message: "Đã xóa môn học" });
    } catch {
        res.status(500).json({ error: "Lỗi xóa môn học" });
    }
});

// =======================
// INITIALIZATION
// =======================
async function startServer() {
    try {
        KeyService.initKeys();
        db = await initDb();
        bcm = new BlockchainService(db);
        
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
}

// Execute startup
startServer();
