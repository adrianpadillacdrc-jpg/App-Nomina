export default async function run(page, ui) {
  const snap = await ui.snapshot();
  const refs = snap.split('\n').filter(l => l.includes('textbox'));
  await ui.fill(refs[0]?.match(/@(e\d+)/)?.[1], 'admin@numa.com');
  await ui.fill(refs[1]?.match(/@(e\d+)/)?.[1], 'AdminNuma2025!');
  await ui.click(snap.match(/@(e\d+) button "Iniciar Sesión"/)?.[1]);
  await page.waitForTimeout(5000);
  await page.goto('http://localhost:4200/contratos-empleados');
  await page.waitForTimeout(6000);
  const listado = await page.evaluate(() => document.body.innerText.slice(0, 500));
  const btn = (await ui.snapshot()).match(/@(e\d+) button "Ver Contrato"/)?.[1];
  let modal = null, errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 100)); });
  page.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().slice(-50)); });
  if (btn) { await ui.click(btn); await page.waitForTimeout(3500); }
  modal = await page.evaluate(() => {
    const m = document.querySelector('.modal-contrato, .contrato-content, .modal-overlay');
    return m ? m.textContent.slice(0, 400) : 'NO_MODAL';
  });
  await page.screenshot({ path: 'C:/Users/yerso/Downloads/App Nomina/rev_contrato.png' });
  return { listado, modal, errs };
}
