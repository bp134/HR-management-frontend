from playwright.sync_api import sync_playwright
import json
import shutil
import tempfile
import time

base_url = "https://3000-iqje0yuu4upyecyswswhs-ec81643c.us2.manus.computer"
unique_suffix = str(int(time.time()))[-6:]
valid_csv = "\n".join([
    "employeeNumber,firstName,lastName,email,phone,dateOfBirth,niNumber,addressLine1,addressLine2,city,postcode,departmentId,managerId,jobTitle,employmentStatus,startDate,contractType,salaryBasis,salaryAmount,hoursPerWeek,contractEndDate,probationEndDate,documentCategory,documentName,documentExpiryDate",
    f"EMP-AUTO-{unique_suffix},Taylor,Import,taylor.import.{unique_suffix}@example.com,,1992-05-14,NIAUTO{unique_suffix},11 Automation Way,,Leeds,LS1 4AB,1,1,People Analyst,active,2026-04-16,permanent,annual,41000,37,,,contract,Employment Contract,",
])
invalid_csv = "\n".join([
    "employeeNumber,firstName,lastName,email,phone,dateOfBirth,niNumber,addressLine1,addressLine2,city,postcode,departmentId,managerId,jobTitle,employmentStatus,startDate,contractType,salaryBasis,salaryAmount,hoursPerWeek,contractEndDate,probationEndDate,documentCategory,documentName,documentExpiryDate",
    "EMP-1001,Invalid,Row,not-an-email,,1992-02-31,NIBADCSV,11 Broken Way,,Leeds,LS1 4AB,1,1,People Analyst,active,2026-04-16,permanent,quarterly,41000,37,,,contract,Employment Contract,",
])

results = {
    "export_visible": False,
    "export_download_succeeded": False,
    "import_success_summary_visible": False,
    "import_error_review_visible": False,
    "imported_employee_number": None,
    "error_excerpt": None,
}

with sync_playwright() as p:
    profile_copy = tempfile.mkdtemp(prefix="csv-browser-profile-")
    shutil.copytree(
        "/home/ubuntu/.browser_data_dir",
        profile_copy,
        dirs_exist_ok=True,
        ignore=shutil.ignore_patterns("SingletonLock", "SingletonSocket", "SingletonCookie"),
    )
    context = p.chromium.launch_persistent_context(profile_copy, headless=True, accept_downloads=True)
    page = context.new_page()

    try:
        page.goto(f"{base_url}/employees?impersonate=off", wait_until="networkidle", timeout=30000)
        page.get_by_text("Bulk CSV administration").wait_for(timeout=15000)

        export_button = page.get_by_role("button", name="Export CSV")
        results["export_visible"] = export_button.is_visible()

        with page.expect_download(timeout=10000) as download_info:
            export_button.click()
        download = download_info.value
        download_path = download.path()
        results["export_download_succeeded"] = bool(download_path)

        page.locator("textarea").fill(valid_csv)
        page.get_by_role("button", name="Import CSV").click()
        success_summary = page.get_by_text("Last import summary")
        success_summary.wait_for(timeout=15000)
        results["import_success_summary_visible"] = success_summary.is_visible()

        body_text = page.locator("body").inner_text()
        marker = "Imported employee numbers:"
        if marker in body_text:
            results["imported_employee_number"] = body_text.split(marker, 1)[1].split(".", 1)[0].strip()

        page.locator("textarea").fill(invalid_csv)
        page.get_by_role("button", name="Import CSV").click()
        error_review = page.get_by_text("Rows needing attention")
        error_review.wait_for(timeout=15000)
        results["import_error_review_visible"] = error_review.is_visible()
        results["error_excerpt"] = page.locator("body").inner_text()
    except Exception as error:
        results["error_excerpt"] = str(error)
    finally:
        print(json.dumps(results, indent=2))
        context.close()
        shutil.rmtree(profile_copy, ignore_errors=True)
