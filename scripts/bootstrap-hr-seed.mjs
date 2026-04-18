import { listDepartments, listEmployeesForUser } from "../server/db.ts";

const bootstrapUser = {
  id: 1,
  name: "System Owner",
  email: "owner@northstar.test",
  role: "admin",
};

const departments = await listDepartments();
const employees = await listEmployeesForUser(bootstrapUser, { page: 1, pageSize: 10 });

console.log(`departments seeded: ${departments.length}`);
console.log(`employees available: ${employees.total}`);
