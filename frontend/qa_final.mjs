export default async function run(page) {
  await page.goto('http://localhost:4200/login');
  const inputs = await page.locator('input').all();
  await inputs[0].fill('admin@numa.com');
  await inputs[1].fill('admin123');
  await page.locator('button').last().click();
  await page.waitForTimeout(6000);
  return { url: page.url(), text: (await page.locator('body').innerText()).substring(0, 500) };
}
