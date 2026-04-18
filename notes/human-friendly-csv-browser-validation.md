# Human-friendly CSV browser validation notes

- The employee bulk CSV administration panel now explicitly states that imports accept **department ID, code, or name** and **manager ID, employee number, or email**.
- The required header contract displayed in the UI includes the new helper columns: `departmentCode`, `departmentName`, `managerEmployeeNumber`, and `managerEmail`.
- A live test file named `tmp-human-friendly-import.csv` was uploaded successfully through the browser.
- The uploaded sample intentionally leaves `departmentId` and `managerId` blank while relying on `departmentName=People Operations` and `managerEmail=alice.morgan@northstar.test`.

A live import submission reached server-side validation successfully. The returned row-level issue was **not** an unknown department or manager mapping error; instead, the row was rejected because `documentCategory` was required. This indicates the new human-friendly mapping path was accepted far enough to evaluate the remaining business validation rules.

A second live CSV import used `departmentName=People Operations` and `managerEmail=alice.morgan@northstar.test` while leaving the raw `departmentId` and `managerId` fields blank. The import succeeded end to end, created `EMP-HUMAN-CSV-002`, and returned an audit entry with zero row issues. This confirms that testers can now prepare CSV files without looking up internal department or manager IDs.
