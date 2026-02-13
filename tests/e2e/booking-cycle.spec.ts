import { test, expect } from '@playwright/test';

test('End-to-End Booking Cycle: Create User -> Create Booking -> Verify', async ({ page }) => {
  test.setTimeout(90000); // 90s timeout for slower machines

  // 1. Start App
  await page.goto('http://localhost:3000/');

  // --- CHECK & SETUP RECEPTION USER ---
  console.log('🔹 Step 1: Checking for Reception User...');
  
  // Wait for initial load
  try {
    await page.waitForSelector('text=مسؤول الحجوزات', { timeout: 5000 });
  } catch (e) {
    // Ignore, might need login
  }
  
  const receptionExists = await page.getByText('مسؤول الحجوزات').count() > 0 || await page.getByText('Test Reception').count() > 0;

  if (!receptionExists) {
    console.log('⚠️ No Reception user found. Logging in as Manager to create one.');
    
    // Login as Manager (Bootstrap)
    const managerUser = page.locator('button').filter({ hasText: 'المديرة (Sura)' }).or(page.locator('button').filter({ hasText: 'Black' })).first();
    await expect(managerUser).toBeVisible({ timeout: 10000 });
    await managerUser.click();
    
    await page.getByPlaceholder('أدخل الرقم السري').fill('1234');
    await page.getByPlaceholder('أدخل الرقم السري').press('Enter');
    
    // Navigate to Team using robust testID
    // Wait for ANY dashboard element to ensure login success
    console.log('🔹 Waiting for Dashboard...');
    try {
        await expect(page.getByTestId('section-home')).toBeVisible({ timeout: 30000 });
    } catch (e) {
        console.log('⚠️ Dashboard not found. Dumping page text:');
        console.log((await page.innerText('body')).slice(0, 500));
        throw e;
    }
    
    console.log('🔹 Navigating to Team Section...');
    await page.getByTestId('section-team').click();
    
    // Add New User
    await page.getByRole('button', { name: 'إضافة عضو جديد' }).click();
    await expect(page.getByText('إضافة موظف جديد')).toBeVisible();
    
    // Fill User Form
    await page.getByPlaceholder('مثال: أحمد محمد').fill('Test Reception');
    await page.getByPlaceholder('مثال: مشرف صباحي').fill('Tester');
    
    // Select Role
    await page.locator('select').selectOption('reception');
    
    // Set PIN
    await page.getByPlaceholder('••••').fill('1234');
    
    // Save
    await page.getByRole('button', { name: 'إنشاء الحساب' }).click();
    
    // Verify Success
    await expect(page.getByText('تم إنشاء حساب Test Reception بنجاح')).toBeVisible();
    
    // Logout
    console.log('🔹 Logout Manager');
    await page.getByTestId('user-menu-btn').click(); 
    await page.getByText('تسجيل خروج').click();
  } else {
    console.log('✅ Reception user found.');
  }

  // --- RECEPTION FLOW ---
  console.log('🔹 Step 2: Login as Reception');
  
  // Wait for Login Screen to settle (Avatar list)
  console.log('🔹 Waiting for login screen...');
  await page.waitForTimeout(5000); 

  // Click on Reception Avatar (Try Test Reception first, then generic)
  const testReception = page.getByText('Test Reception').first();
  const genericReception = page.getByText('مسؤول الحجوزات').first();
  
  // Wait for one of them to be visible
  await expect(testReception.or(genericReception)).toBeVisible({ timeout: 10000 });
  
  if (await testReception.isVisible()) {
      console.log('🔹 Clicking Test Reception');
      await testReception.click();
  } else {
      console.log('🔹 Clicking Generic Reception');
      await genericReception.click();
  }

  // Wait for Password Input to appear
  console.log('🔹 Waiting for Password Input...');
  await expect(page.getByPlaceholder('أدخل الرقم السري')).toBeVisible({ timeout: 10000 });

  // Fill PIN
  await page.getByPlaceholder('أدخل الرقم السري').fill('1234');
  await page.getByPlaceholder('أدخل الرقم السري').press('Enter');

  // Verify Dashboard
  await expect(page.getByText('الرئيسية')).toBeVisible();
  
  // Navigate to Bookings Section
  console.log('🔹 Navigating to Bookings Section...');
  await page.getByRole('button', { name: 'الحجوزات' }).click();
  
  console.log('🔹 Step 3: Create Booking');
  // Click Add Booking Button (Target the main reception button explicitly)
  console.log('🔹 Clicking Add Button...');
  await page.getByTestId('add-booking-btn').click({ force: true });

  // 1. Wait for Booking Type Modal (Intermediary Step)
  console.log('🔹 Waiting for Booking Type Selection...');
  await expect(page.getByText('نوع الحجز')).toBeVisible();
  
  // 2. Select "Shooting Session" (جلسات التصوير)
  console.log('🔹 Selecting Type: Shoot...');
  await page.getByText('جلسات التصوير').click({ force: true });

  // 3. Wait for Main Add Booking Modal (Wait for the Date Input to be sure form is loaded)
  console.log('🔹 Waiting for Main Form (Date Input)...');
  // Wait for the date input which is definitely in the main form
  const dateInput = page.locator('input[type="date"]').first();
  await expect(dateInput).toBeVisible({ timeout: 20000 });
  
  // Fill Form
  await page.waitForTimeout(500); // Animation wait
  
  // Select Package (Assuming 'custom' is in the second select)
  console.log('🔹 Selecting Custom Package...');
  const selects = page.locator('select');
  await selects.nth(1).selectOption('custom');
  
  // Wait for Price Input to appear (only visible for custom package)
  console.log('🔹 Waiting for Price Input...');
  const priceInput = page.getByPlaceholder('أدخل سعر الباقة');
  await expect(priceInput).toBeVisible({ timeout: 5000 });
  
  // 2. Fill Price
  console.log('🔹 Filling Price...');
  await priceInput.fill('1500');

  // 3. Fill Names (Groom)
  console.log('🔹 Filling Groom Name...');
  await page.getByPlaceholder('الاسم الكامل').first().fill('Auto Test Groom');
  
  // 4. Fill Phone
  console.log('🔹 Filling Phone...');
  await page.getByPlaceholder('07XX...').first().fill('07701234567');

  // 5. Fill Date (Tomorrow) - Using Custom Date Picker
  console.log('🔹 Filling Date...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayToSelect = tomorrow.getDate(); // Just the day number

  // Open Date Picker Modal
  await page.getByTestId('date-picker-trigger').click();
  
  // Select Day in Calendar (looking for exact text of the day number)
  // We need to be careful not to select "days in previous/next month" if they are visible, 
  // but our date picker renders empty slots for previous month.
  // The button text is just the number.
  await page.getByRole('button', { name: `${dayToSelect}`, exact: true }).first().click();

  // 6. Submit
  console.log('🔹 Submitting Booking...');
  await page.getByRole('button', { name: 'تأكيد الحجز' }).click();

  // Verify Success - Wait for success toast OR modal to close
  // Check for the toast message or the modal disappearance
  console.log('🔹 Verifying success...');
  
  // Wait for either the success toast OR the modal to disappear (success)
  // Or check if the "Conflict" modal appeared (failure/warning)
  await Promise.race([
      page.getByText('تم إضافة الحجز بنجاح').waitFor({ state: 'visible', timeout: 20000 }),
      page.getByTestId('add-booking-modal').waitFor({ state: 'hidden', timeout: 20000 }),
      page.getByText('تعارض في الوقت').waitFor({ state: 'visible', timeout: 5000 }).then(() => { throw new Error('Time Conflict Detected!'); })
  ]);
  
  console.log('✅ Booking Submitted Successfully');
  
  // Logout
  console.log('🔹 Step 4: Logout Reception');
  // Click Avatar first to open dropdown
  // Finding the avatar button in header is tricky without specific ID
  // It's usually the last item in header actions
  await page.locator('header button.rounded-full').last().click();
  await page.getByText('تسجيل خروج').click();

  // --- MANAGER FLOW ---
  console.log('🔹 Step 5: Login as Manager to Verify');
  await page.getByText('المديرة (Sura)').click();
  await page.getByPlaceholder('أدخل الرقم السري').fill('1234');
  await page.getByPlaceholder('أدخل الرقم السري').press('Enter');

  // Verify Dashboard
  await expect(page.getByText('الرئيسية')).toBeVisible();

  console.log('🔹 Step 6: Verify Booking in List');
  // Wait for booking to appear
  await expect(page.getByText('Auto Test Groom')).toBeVisible();
  
  // Verify Price
  await expect(page.getByText('1,500')).toBeVisible();

  console.log('✅ Cycle Completed Successfully!');
});
