const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function check() {
    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    console.log("--- STUDENTS ---");
    const students = await db.all('SELECT * FROM students');
    console.log(JSON.stringify(students, null, 2));

    console.log("\n--- GRADES ---");
    const grades = await db.all('SELECT * FROM grades');
    console.log(JSON.stringify(grades, null, 2));

    console.log("\n--- CERTIFICATES ---");
    const certs = await db.all('SELECT * FROM certificates');
    console.log(JSON.stringify(certs, null, 2));

    await db.close();
}

check().catch(console.error);
