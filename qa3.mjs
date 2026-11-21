export default async function run(page, ui) {
  const snap = await ui.snapshot();
  const refs = snap.split('\n').filter(l => l.includes('textbox'));
  const userRef = refs[0]?.match(/@(e\d+)/)?.[1];
  const passRef = refs[1]?.match(/@(e\d+)/)?.[1];
  const btnRef = snap.match(/@(e\d+) button "Iniciar Sesión"/)?.[1];
  if (!userRef || !btnRef) return { error: 'refs', snapshot: snap.slice(0, 300) };
  await ui.fill(userRef, 'admin@numa.com');
  await ui.fill(passRef, 'AdminNuma2025!');
  await ui.click(btnRef);
  await page.waitForTimeout(6000);
  const url1 = page.url();

  await page.goto('http://localhost:4200/contratos-empleados');
  await page.waitForTimeout(7000);
  const listado = await page.evaluate(() => document.body.innerText.slice(0, 500));

  const snap2 = await ui.snapshot();
  const btn = snap2.match(/@(e\d+) button "Ver Contrato"/)?.[1]
    || snap2.match(/@(e\d+) button "Ver contrato"/)?.[1];
  let modal = 'SIN_BOTON';
  if (btn) {
    await ui.click(btn);
    await page.waitForTimeout(4000);
    modal = await page.evaluate(() => {
      const m = document.querySelector('.modal-contrato, .contrato-content, .modal-overlay, .modal');
      return m ? m.textContent.slice(0, 500) : 'NO_MODAL';
    });
  }
  await page.screenshot({ path: 'C:/Users/yerso/Downloads/App Nomina/rev_contrato.png' });
  return { url1, listado, modal, snapshot: snap2.slice(0, 600) };
}
