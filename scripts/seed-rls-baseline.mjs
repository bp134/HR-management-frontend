import { getUserByOpenId, listEmployeesForUser, upsertUser } from "../server/db.ts";

const seededUsers = [
  {
    id: 3,
    openId: "seed-rls-manager-3",
    name: "Marcus Shaw",
    email: "marcus.shaw@northstar.test",
    loginMethod: "seed",
    role: "manager",
  },
  {
    id: 4,
    openId: "seed-rls-employee-4",
    name: "Hannah Lee",
    email: "hannah.lee@northstar.test",
    loginMethod: "seed",
    role: "employee",
  },
];

for (const user of seededUsers) {
  await upsertUser(user);
}

for (const { openId, role, email, name } of seededUsers) {
  const persisted = await getUserByOpenId(openId);
  if (!persisted) {
    throw new Error(`Failed to persist ${role} seed for ${email}`);
  }

  const visibleEmployees = await listEmployeesForUser(
    {
      id: persisted.id,
      openId: persisted.openId,
      name: persisted.name,
      email: persisted.email,
      loginMethod: persisted.loginMethod,
      role: persisted.role,
      createdAt: persisted.createdAt,
      updatedAt: persisted.updatedAt,
      lastSignedIn: persisted.lastSignedIn,
    },
    { page: 1, pageSize: 20 },
  );

  console.log(
    JSON.stringify(
      {
        seededRole: role,
        openId,
        email,
        name,
        persistedRole: persisted.role,
        visibleEmployeeCount: visibleEmployees.total,
        visibleEmployeeEmails: visibleEmployees.rows.map(employee => employee.email),
      },
      null,
      2,
    ),
  );
}
