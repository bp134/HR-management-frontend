import { chromium } from '/home/ubuntu/.nvm/versions/node/v22.13.0/lib/node_modules/playwright/index.mjs';

const baseUrl = 'https://3000-iqje0yuu4upyecyswswhs-ec81643c.us2.manus.computer';
const validCsv = [
  'employeeNumber,firstName,lastName,email,phone,dateOfBirth,niNumber,addressLine1,addressLine2,city,postcode,departmentId,managerId,jobTitle,employmentStatus,startDate,contractType,salaryBasis,salaryAmount,hoursPerWeek,contractEndDate,probationEndDate,documentCategory,documentName,documentExpiryDate',
  `EMP-AUTO-${Date.now().toString().slice(-6)},Taylor,Import,taylor.import.${Date.now().toString().slice(-6)}@example.com,,1992-05-14,NIAUTO${Date.now().toString().slice(-6)},11 Automation Way,,Leeds,LS1 4AB,1,1,People Analyst,active,2026-04-16,permanent,annual,41000,37,,,contract,Employment Contract,`,
].join('\n');
const invalidCsv = [
  'employeeNumber,firstName,lastName,email,phone,dateOfBirth,niNumber,addressLine1,addressLine2,city,postcode,departmentId,managerId,jobTitle,employmentStatus,startDate,contractType,salaryBasis,salaryAmount,hoursPerWeek,contractEndDate,probationEndDate,documentCategory,documentName,documentExpiryDate',
  'EMP-1001,Invalid,Row,not-an-email,,1992-02-31,NIBADCSV,11 Broken Way,,Leeds,LS1 4AB,1,1,People Analyst,active,2026-04-16,permanent,quarterly,41000,37,,,contract,Employment Contract,',
].join('\n');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ acceptDownloads: true });

const results = {
  exportVisible: false,
  exportDownloadSucceeded: false,
  importSuccessSummaryVisible: false,
  importErrorReviewVisible: false,
  importedEmployeeNumber: null,
  errorText: null,
};

try {
  await page.goto(`${baseUrl}/employees?impersonate=off`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Bulk CSV administration', { timeout: 15000 });

  const exportButton = page.getByRole('button', { name: 'Export CSV' });
  results.exportVisible = await exportButton.isVisible();

  const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
  await exportButton.click();
  const download = await downloadPromise;
  if (download) {
    const path = await download.path();
    results.exportDownloadSucceeded = Boolean(path);
  }

  await page.locator('textarea').fill(validCsv);
  await page.getByRole('button', { name: 'Import CSV' }).click();
  const successSummary = page.getByText('Last import summary');
  await successSummary.waitFor({ timeout: 15000 });
  results.importSuccessSummaryVisible = await successSummary.isVisible();

  const summaryText = await page.locator('body').innerText();
  const importedMatch = summaryText.match(/Imported employee numbers:\s*([^\.]+)/);
  if (importedMatch) {
    results.importedEmployeeNumber = importedMatch[1].trim();
  }

  await page.locator('textarea').fill(invalidCsv);
  await page.getByRole('button', { name: 'Import CSV' }).click();
  const errorReview = page.getByText('Rows needing attention');
  await errorReview.waitFor({ timeout: 15000 });
  results.importErrorReviewVisible = await errorReview.isVisible();
  results.errorText = await page.locator('body').innerText();
} catch (error) {
  results.errorText = error instanceof Error ? error.message : String(error);
} finally {
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}
