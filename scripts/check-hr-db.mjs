import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const connection = await mysql.createConnection(url);
const tables = [
  "users",
  "departments",
  "employees",
  "contracts",
  "documents",
  "leaveBalances",
  "leaveRequests",
  "professionalRegistrations",
  "auditLogs",
];

for (const table of tables) {
  const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
  const count = Array.isArray(rows) ? rows[0]?.count ?? 0 : 0;
  console.log(`${table}: ${count}`);
}

await connection.end();
