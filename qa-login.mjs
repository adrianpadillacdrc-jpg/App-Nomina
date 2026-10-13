export default async function run(page, ui) {
  // Llenar el formulario de login con credenciales de prueba admin
  await ui.fill('@e1', 'admin');
  await ui.fill('@e2', 'admin123');
  await page.waitForTimeout(200);

  const snap1 = await ui.snapshot();
  const loginBtn = snap1.match(/@(e\d+) button "Iniciar Sesión"/)?.[1];
  if (!loginBtn) return { error: 'no login button', snapshot: snap1 };

  await ui.click(loginBtn);
  // Esperar a que la página cambie (puede redirigir al dashboard o mostrar error)
  await page.waitForTimeout(2500);

  const snap2 = await ui.snapshot();
  return { afterLogin: snap2 };
}
