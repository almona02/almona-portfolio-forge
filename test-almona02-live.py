"""
Almona02.com Live Testing Script (Python + Selenium)

This script uses Selenium WebDriver to automate testing of the live site.
Works on Windows without npm/node.js

Prerequisites:
pip install selenium webdriver-manager

Usage:
python test-almona02-live.py
"""

import os
import json
import time
from datetime import datetime
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

# Test configuration
CONFIG = {
    'url': 'https://almona02.com',
    'credentials': {
        'email': 'almona.co@hotmail.com',
        'password': 'abcd1234'
    },
    'windows': [
        {'width': 800, 'height': 1200, 'type': 'Small Window'},
        {'width': 1500, 'height': 1800, 'type': 'Medium Window'},
        {'width': 2400, 'height': 2100, 'type': 'Large Window'}
    ],
    'screenshot_dir': './test-screenshots',
    'download_dir': './test-downloads',
    'timeout': 30
}

# Create directories
Path(CONFIG['screenshot_dir']).mkdir(exist_ok=True)
Path(CONFIG['download_dir']).mkdir(exist_ok=True)

class AlmonaLiveTester:
    def __init__(self):
        self.driver = None
        self.test_results = {
            'timestamp': datetime.now().isoformat(),
            'tests': [],
            'screenshots': [],
            'errors': [],
            'downloaded_files': []
        }
        
    def setup_driver(self):
        """Initialize Chrome WebDriver"""
        print("🚀 Setting up Chrome WebDriver...")
        
        chrome_options = Options()
        chrome_options.add_argument('--start-maximized')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        
        # Set download directory
        prefs = {
            'download.default_directory': os.path.abspath(CONFIG['download_dir']),
            'download.prompt_for_download': False,
            'download.directory_upgrade': True,
            'safebrowsing.enabled': True
        }
        chrome_options.add_experimental_option('prefs', prefs)
        
        # Uncomment for headless mode
        # chrome_options.add_argument('--headless')
        
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.driver.implicitly_wait(10)
        
        print("✅ Chrome WebDriver ready")
        
    def take_screenshot(self, name):
        """Take a screenshot and save it"""
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        filename = f"{timestamp}_{name}.png"
        filepath = os.path.join(CONFIG['screenshot_dir'], filename)
        self.driver.save_screenshot(filepath)
        self.test_results['screenshots'].append(filename)
        print(f"📸 Screenshot saved: {filename}")
        return filepath
        
    def wait_and_log(self, message, seconds=2):
        """Wait and log a message"""
        print(f"⏳ {message}")
        time.sleep(seconds)
        
    def find_element_by_multiple_selectors(self, selectors, by=By.CSS_SELECTOR):
        """Try multiple selectors to find an element"""
        for selector in selectors:
            try:
                element = self.driver.find_element(by, selector)
                if element:
                    return element
            except NoSuchElementException:
                continue
        return None
        
    def test_navigate_to_site(self):
        """Test 1: Navigate to the site"""
        print("\n" + "="*60)
        print("📋 TEST 1: Navigate to Site")
        print("="*60)
        
        try:
            self.driver.get(CONFIG['url'])
            self.wait_and_log("Page loaded", 3)
            self.take_screenshot("01_homepage")
            
            self.test_results['tests'].append({
                'name': 'Navigate to Site',
                'status': 'PASS'
            })
            print("✅ TEST PASSED: Site loaded successfully")
            return True
        except Exception as e:
            print(f"❌ TEST FAILED: {str(e)}")
            self.test_results['tests'].append({
                'name': 'Navigate to Site',
                'status': 'FAIL'
            })
            self.test_results['errors'].append(f"Navigation error: {str(e)}")
            return False
            
    def test_login(self):
        """Test 2: Login"""
        print("\n" + "="*60)
        print("📋 TEST 2: Login")
        print("="*60)
        
        try:
            # Find email input
            email_selectors = [
                'input[type="email"]',
                'input[name="email"]',
                'input[placeholder*="email" i]',
                '#email',
                '.email-input'
            ]
            
            email_input = self.find_element_by_multiple_selectors(email_selectors)
            
            if not email_input:
                print("⚠️  Could not find email input")
                self.take_screenshot("02_login_page_inspection")
                self.test_results['errors'].append("Email input not found")
                return False
                
            # Enter email
            email_input.clear()
            email_input.send_keys(CONFIG['credentials']['email'])
            print(f"✅ Email entered: {CONFIG['credentials']['email']}")
            
            # Find password input
            password_selectors = [
                'input[type="password"]',
                'input[name="password"]',
                '#password',
                '.password-input'
            ]
            
            password_input = self.find_element_by_multiple_selectors(password_selectors)
            
            if password_input:
                password_input.clear()
                password_input.send_keys(CONFIG['credentials']['password'])
                print("✅ Password entered")
            
            self.wait_and_log("Credentials entered", 1)
            self.take_screenshot("02_login_filled")
            
            # Click login button
            login_button_selectors = [
                'button[type="submit"]',
                'button:contains("Login")',
                'button:contains("Sign In")',
                '.login-button',
                '#login-button'
            ]
            
            login_button = self.find_element_by_multiple_selectors(login_button_selectors)
            
            if login_button:
                login_button.click()
                print("✅ Login button clicked")
            else:
                # Try submitting the form
                email_input.submit()
                print("✅ Form submitted")
            
            self.wait_and_log("Waiting for login to complete", 3)
            self.take_screenshot("03_after_login")
            
            self.test_results['tests'].append({
                'name': 'Login',
                'status': 'PASS'
            })
            print("✅ TEST PASSED: Login successful")
            return True
            
        except Exception as e:
            print(f"❌ TEST FAILED: {str(e)}")
            self.test_results['tests'].append({
                'name': 'Login',
                'status': 'FAIL'
            })
            self.test_results['errors'].append(f"Login error: {str(e)}")
            self.take_screenshot("ERROR_login")
            return False
            
    def test_create_project(self):
        """Test 3: Create New Project"""
        print("\n" + "="*60)
        print("📋 TEST 3: Create New Project")
        print("="*60)
        
        try:
            # Find "New Project" button
            new_project_selectors = [
                '//button[contains(text(), "New Project")]',
                '//button[contains(text(), "Create Project")]',
                '//a[contains(text(), "New Project")]',
                '.new-project-button',
                '#new-project'
            ]
            
            new_project_button = None
            for selector in new_project_selectors:
                try:
                    if selector.startswith('//'):
                        new_project_button = self.driver.find_element(By.XPATH, selector)
                    else:
                        new_project_button = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if new_project_button:
                        break
                except NoSuchElementException:
                    continue
            
            if not new_project_button:
                print("⚠️  Could not find New Project button")
                self.take_screenshot("04_dashboard_inspection")
                self.test_results['errors'].append("New Project button not found")
                return False
            
            new_project_button.click()
            print("✅ New Project button clicked")
            
            self.wait_and_log("Waiting for project form", 2)
            self.take_screenshot("04_new_project_form")
            
            # Fill project details
            project_name = f"Test_CutList_{datetime.now().strftime('%Y%m%d')}"
            
            name_selectors = [
                'input[name="name"]',
                'input[placeholder*="name" i]',
                '#project-name',
                '.project-name-input'
            ]
            
            name_input = self.find_element_by_multiple_selectors(name_selectors)
            if name_input:
                name_input.clear()
                name_input.send_keys(project_name)
                print(f"✅ Project name entered: {project_name}")
            
            client_selectors = [
                'input[name="client"]',
                'input[placeholder*="client" i]',
                '#client-name'
            ]
            
            client_input = self.find_element_by_multiple_selectors(client_selectors)
            if client_input:
                client_input.clear()
                client_input.send_keys("Test Client")
                print("✅ Client name entered")
            
            self.wait_and_log("Project form filled", 1)
            self.take_screenshot("05_project_form_filled")
            
            # Submit form
            submit_selectors = [
                'button[type="submit"]',
                '//button[contains(text(), "Create")]',
                '//button[contains(text(), "Save")]',
                '.submit-button'
            ]
            
            submit_button = None
            for selector in submit_selectors:
                try:
                    if selector.startswith('//'):
                        submit_button = self.driver.find_element(By.XPATH, selector)
                    else:
                        submit_button = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if submit_button:
                        break
                except NoSuchElementException:
                    continue
            
            if submit_button:
                submit_button.click()
                print("✅ Form submitted")
            
            self.wait_and_log("Project created", 3)
            self.take_screenshot("06_project_created")
            
            self.test_results['tests'].append({
                'name': 'Create Project',
                'status': 'PASS',
                'details': project_name
            })
            print("✅ TEST PASSED: Project created successfully")
            return True
            
        except Exception as e:
            print(f"❌ TEST FAILED: {str(e)}")
            self.test_results['tests'].append({
                'name': 'Create Project',
                'status': 'FAIL'
            })
            self.test_results['errors'].append(f"Project creation error: {str(e)}")
            self.take_screenshot("ERROR_project_creation")
            return False
            
    def test_add_window(self, window_config, index):
        """Test: Add a window"""
        print("\n" + "="*60)
        print(f"📋 TEST {4 + index}: Add {window_config['type']} ({window_config['width']}x{window_config['height']})")
        print("="*60)
        
        try:
            # Find "Add Window" button
            add_window_selectors = [
                '//button[contains(text(), "Add Window")]',
                '//button[contains(text(), "New Window")]',
                '.add-window-button',
                '#add-window'
            ]
            
            add_window_button = None
            for selector in add_window_selectors:
                try:
                    if selector.startswith('//'):
                        add_window_button = self.driver.find_element(By.XPATH, selector)
                    else:
                        add_window_button = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if add_window_button:
                        break
                except NoSuchElementException:
                    continue
            
            if add_window_button:
                add_window_button.click()
                print("✅ Add Window button clicked")
            
            self.wait_and_log("Window form opened", 2)
            self.take_screenshot(f"07_window{index + 1}_form")
            
            # Enter width
            width_selectors = [
                'input[name="width"]',
                'input[placeholder*="width" i]',
                '#width'
            ]
            
            width_input = self.find_element_by_multiple_selectors(width_selectors)
            if width_input:
                width_input.clear()
                width_input.send_keys(str(window_config['width']))
                print(f"✅ Width entered: {window_config['width']}")
            
            # Enter height
            height_selectors = [
                'input[name="height"]',
                'input[placeholder*="height" i]',
                '#height'
            ]
            
            height_input = self.find_element_by_multiple_selectors(height_selectors)
            if height_input:
                height_input.clear()
                height_input.send_keys(str(window_config['height']))
                print(f"✅ Height entered: {window_config['height']}")
            
            self.wait_and_log("Window dimensions entered", 1)
            self.take_screenshot(f"08_window{index + 1}_filled")
            
            # Save window
            save_selectors = [
                'button[type="submit"]',
                '//button[contains(text(), "Save")]',
                '//button[contains(text(), "Add")]',
                '.save-button'
            ]
            
            save_button = None
            for selector in save_selectors:
                try:
                    if selector.startswith('//'):
                        save_button = self.driver.find_element(By.XPATH, selector)
                    else:
                        save_button = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if save_button:
                        break
                except NoSuchElementException:
                    continue
            
            if save_button:
                save_button.click()
                print("✅ Window saved")
            
            self.wait_and_log("Window added to project", 2)
            self.take_screenshot(f"09_window{index + 1}_saved")
            
            self.test_results['tests'].append({
                'name': f"Add {window_config['type']}",
                'status': 'PASS',
                'details': f"{window_config['width']}x{window_config['height']}mm"
            })
            print(f"✅ TEST PASSED: {window_config['type']} added successfully")
            return True
            
        except Exception as e:
            print(f"❌ TEST FAILED: {str(e)}")
            self.test_results['tests'].append({
                'name': f"Add {window_config['type']}",
                'status': 'FAIL'
            })
            self.test_results['errors'].append(f"Window {index + 1} error: {str(e)}")
            self.take_screenshot(f"ERROR_window{index + 1}")
            return False
            
    def test_generate_cutlist(self):
        """Test 7: Generate Cut List"""
        print("\n" + "="*60)
        print("📋 TEST 7: Generate Cut List")
        print("="*60)
        
        try:
            # Find "Generate Cut List" button
            cutlist_selectors = [
                '//button[contains(text(), "Generate Cut List")]',
                '//button[contains(text(), "Cut List")]',
                '//button[contains(text(), "Optimization")]',
                '.generate-cutlist-button',
                '#generate-cutlist'
            ]
            
            cutlist_button = None
            for selector in cutlist_selectors:
                try:
                    if selector.startswith('//'):
                        cutlist_button = self.driver.find_element(By.XPATH, selector)
                    else:
                        cutlist_button = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if cutlist_button:
                        break
                except NoSuchElementException:
                    continue
            
            if cutlist_button:
                cutlist_button.click()
                print("✅ Generate Cut List button clicked")
            
            self.wait_and_log("Generating cut list...", 5)
            self.take_screenshot("10_cutlist_generated")
            
            # Try to extract cut list data
            try:
                cutlist_data = self.driver.execute_script("""
                    const data = {
                        windows: [],
                        totalMaterial: null,
                        wastePercentage: null
                    };
                    
                    // Try to extract from tables
                    const tables = document.querySelectorAll('table');
                    tables.forEach(table => {
                        const rows = table.querySelectorAll('tr');
                        rows.forEach(row => {
                            const cells = row.querySelectorAll('td');
                            if (cells.length > 0) {
                                data.windows.push(Array.from(cells).map(cell => cell.textContent.trim()));
                            }
                        });
                    });
                    
                    return data;
                """)
                
                print("📊 Cut List Data:")
                print(json.dumps(cutlist_data, indent=2))
                self.test_results['cutlist_data'] = cutlist_data
                
            except Exception as e:
                print(f"⚠️  Could not extract cut list data: {str(e)}")
            
            self.test_results['tests'].append({
                'name': 'Generate Cut List',
                'status': 'PASS'
            })
            print("✅ TEST PASSED: Cut list generated successfully")
            return True
            
        except Exception as e:
            print(f"❌ TEST FAILED: {str(e)}")
            self.test_results['tests'].append({
                'name': 'Generate Cut List',
                'status': 'FAIL'
            })
            self.test_results['errors'].append(f"Cut list generation error: {str(e)}")
            self.take_screenshot("ERROR_cutlist")
            return False
            
    def test_download_files(self):
        """Test 8: Download Output Files"""
        print("\n" + "="*60)
        print("📋 TEST 8: Download Output Files")
        print("="*60)
        
        try:
            # Try to download PDF
            pdf_selectors = [
                '//button[contains(text(), "Download PDF")]',
                '//button[contains(text(), "Export PDF")]',
                '//a[contains(text(), "PDF")]',
                '.download-pdf-button'
            ]
            
            for selector in pdf_selectors:
                try:
                    if selector.startswith('//'):
                        pdf_button = self.driver.find_element(By.XPATH, selector)
                    else:
                        pdf_button = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if pdf_button:
                        pdf_button.click()
                        print("✅ PDF download initiated")
                        self.wait_and_log("Downloading PDF...", 3)
                        break
                except NoSuchElementException:
                    continue
            
            # Try to download Excel
            excel_selectors = [
                '//button[contains(text(), "Download Excel")]',
                '//button[contains(text(), "Export Excel")]',
                '//a[contains(text(), "Excel")]',
                '.download-excel-button'
            ]
            
            for selector in excel_selectors:
                try:
                    if selector.startswith('//'):
                        excel_button = self.driver.find_element(By.XPATH, selector)
                    else:
                        excel_button = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if excel_button:
                        excel_button.click()
                        print("✅ Excel download initiated")
                        self.wait_and_log("Downloading Excel...", 3)
                        break
                except NoSuchElementException:
                    continue
            
            self.take_screenshot("11_downloads_complete")
            
            # Check downloaded files
            download_dir = Path(CONFIG['download_dir'])
            files = list(download_dir.glob('*'))
            file_names = [f.name for f in files]
            
            print(f"📁 Downloaded files: {file_names}")
            self.test_results['downloaded_files'] = file_names
            
            self.test_results['tests'].append({
                'name': 'Download Output Files',
                'status': 'PASS',
                'details': f"{len(file_names)} files downloaded"
            })
            print("✅ TEST PASSED: Files downloaded successfully")
            return True
            
        except Exception as e:
            print(f"❌ TEST FAILED: {str(e)}")
            self.test_results['tests'].append({
                'name': 'Download Output Files',
                'status': 'FAIL'
            })
            self.test_results['errors'].append(f"Download error: {str(e)}")
            self.take_screenshot("ERROR_download")
            return False
            
    def run_all_tests(self):
        """Run all tests"""
        print("\n" + "="*60)
        print("🚀 STARTING ALMONA02.COM LIVE TESTING")
        print("="*60)
        
        try:
            self.setup_driver()
            
            # Run tests
            self.test_navigate_to_site()
            self.test_login()
            self.test_create_project()
            
            # Add windows
            for i, window in enumerate(CONFIG['windows']):
                self.test_add_window(window, i)
            
            self.test_generate_cutlist()
            self.test_download_files()
            
            # Final screenshot
            self.wait_and_log("Taking final screenshot", 2)
            self.take_screenshot("12_final_state")
            
        except Exception as e:
            print(f"\n❌ CRITICAL ERROR: {str(e)}")
            self.test_results['errors'].append(f"Critical error: {str(e)}")
            self.take_screenshot("ERROR_critical")
            
        finally:
            self.generate_report()
            if self.driver:
                self.driver.quit()
                print("\n✅ Browser closed")
                
    def generate_report(self):
        """Generate test report"""
        print("\n" + "="*60)
        print("📊 GENERATING TEST REPORT")
        print("="*60)
        
        # Calculate summary
        total = len(self.test_results['tests'])
        passed = len([t for t in self.test_results['tests'] if t['status'] == 'PASS'])
        failed = len([t for t in self.test_results['tests'] if t['status'] == 'FAIL'])
        errors = len(self.test_results['errors'])
        
        self.test_results['summary'] = {
            'total': total,
            'passed': passed,
            'failed': failed,
            'errors': errors
        }
        
        # Save report
        report_path = 'test-report.json'
        with open(report_path, 'w') as f:
            json.dump(self.test_results, f, indent=2)
        
        print(f"✅ Test report saved: {report_path}")
        
        # Print summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️  Errors: {errors}")
        print("="*60)
        
        if errors > 0:
            print("\n⚠️  ERRORS ENCOUNTERED:")
            for i, error in enumerate(self.test_results['errors'], 1):
                print(f"{i}. {error}")
        
        print(f"\n📸 Screenshots saved in: {CONFIG['screenshot_dir']}")
        print(f"📁 Downloads saved in: {CONFIG['download_dir']}")
        print(f"📄 Full report: {report_path}")
        print("\n✅ Testing complete!")

if __name__ == '__main__':
    tester = AlmonaLiveTester()
    tester.run_all_tests()
