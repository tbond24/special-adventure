const { test, expect } = require('@playwright/test');
const { install } = require('../account-drafts/synthetic-cloud.cjs');

async function openSignIn(page, context, dark = false) {
  const state = await install(context);
  await page.goto('/#auth');
  await page.waitForFunction(() => typeof booting !== 'undefined' && !booting);
  await page.evaluate(dark => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; }, dark);
  const form = page.locator('#authUnified');
  await expect(form).toHaveAttribute('data-mode', 'signin');
  const colors = await page.evaluate(() => {
    const probe = document.createElement('span');
    document.body.append(probe);
    const result = {};
    for (const name of ['muted', 'line', 'good', 'bad', 'accent']) {
      probe.style.color = `var(--${name})`;
      result[name] = getComputedStyle(probe).color;
    }
    probe.remove();
    return result;
  });
  return { state, form, colors, email: form.locator('input[name=email]'), password: form.locator('input[name=password]') };
}

async function expectQuiet(field, border) {
  await expect(field).toHaveCSS('outline-width', '0px');
  await expect(field).toHaveCSS('box-shadow', 'none');
  await expect(field).toHaveCSS('border-top-color', border);
}

for (const dark of [false, true]) {
  const theme = dark ? 'dark' : 'light';
  test(`${theme}: typing, clearing, keyboard focus, and visibility keep sign-in rings neutral`, async ({ page, context }, info) => {
    const { state, form, colors, email, password } = await openSignIn(page, context, dark);
    await expectQuiet(email, colors.line);
    await email.focus();
    await expectQuiet(email, colors.muted);
    await email.pressSequentially('publisher@vacancy.test');
    await expect(form.locator('label.credential-complete')).toHaveCount(1);
    await expectQuiet(email, colors.muted);
    await email.press('Tab');
    await expect(password).toBeFocused();
    await expectQuiet(email, colors.line);
    await expectQuiet(password, colors.muted);
    await password.pressSequentially('SyntheticPassword123');
    await expect(form.locator('label.credential-complete')).toHaveCount(2);
    await expectQuiet(password, colors.muted);
    await password.press('Tab');
    const show = form.getByRole('button', { name: 'Show password', exact: true });
    await expect(show).toBeFocused();
    await expect(show).toHaveCSS('outline-color', colors.muted);
    await expectQuiet(password, colors.line);
    await show.press('Enter');
    await expect(password).toHaveAttribute('type', 'text');
    await expect(password).toBeFocused();
    await expectQuiet(password, colors.muted);
    await form.getByRole('button', { name: 'Hide password', exact: true }).click();
    await expect(password).toHaveAttribute('type', 'password');
    await expect(password).toHaveValue('SyntheticPassword123');
    await expectQuiet(password, colors.muted);
    await page.screenshot({ path: info.outputPath(`signin-${theme}.png`), fullPage: true });
    await password.clear();
    await password.blur();
    await email.clear();
    await email.blur();
    await expect(form.locator('label.credential-complete')).toHaveCount(0);
    await expectQuiet(email, colors.line);
    await expectQuiet(password, colors.line);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(state.authRequests).toEqual([]);
    expect(state.cloud.publicWrites).toEqual([]);
  });

  test(`${theme}: browser autofill pseudo-state has no green or orange ring`, async ({ page, context }) => {
    const { state, colors, email, password } = await openSignIn(page, context, dark);
    await email.fill('publisher@vacancy.test');
    await password.fill('SyntheticPassword123');
    await password.blur();
    const cdp = await context.newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    for (const [selector, field] of [['input[name=email]', email], ['input[name=password]', password]]) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#authUnified ' + selector });
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['autofill'] });
      expect(await field.evaluate(node => node.matches(':autofill'))).toBe(true);
      await expectQuiet(field, colors.line);
      await field.focus();
      await expectQuiet(field, colors.muted);
      await field.blur();
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
    }
    await cdp.detach();
    expect(state.authRequests).toEqual([]);
    expect(state.cloud.publicWrites).toEqual([]);
  });

  test(`${theme}: invalid fields and failed sign-in keep meaningful validation and retry`, async ({ page, context }) => {
    const { state, form, colors, email, password } = await openSignIn(page, context, dark);
    await email.fill('invalid-email');
    await email.blur();
    await expect(form.locator('label.credential-error')).toHaveCount(1);
    await expectQuiet(email, colors.bad);
    expect(await email.evaluate(node => node.validity.typeMismatch)).toBe(true);
    expect(await email.evaluate(node => node.validationMessage)).not.toBe('');
    await form.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(email).toBeFocused();
    expect(state.authRequests).toEqual([]);
    await email.fill('publisher@vacancy.test');
    await password.fill('SyntheticPassword123');
    state.failAuth = true;
    await form.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('#toast.show')).toContainText('Synthetic sign-in failure');
    await expect(form).toBeVisible();
    await expect(form.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
    await expectQuiet(email, colors.line);
    await expectQuiet(password, colors.line);
    expect(state.authRequests).toHaveLength(1);
    state.failAuth = false;
    await form.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(form).toHaveCount(0);
    expect(state.authRequests).toHaveLength(2);
    expect(state.cloud.publicWrites).toEqual([]);
  });
}

test('sign-in styling stays scoped when switching to signup and password recovery', async ({ page, context }) => {
  const { state, form, colors, email, password } = await openSignIn(page, context);
  await form.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(form).toHaveAttribute('data-mode', 'signup');
  await email.fill('publisher@vacancy.test');
  await password.fill('SyntheticPassword123');
  await expect(password).toHaveCSS('outline-color', colors.accent);
  await expect(password).toHaveCSS('outline-width', '2px');
  await expect(password).toHaveCSS('border-top-color', colors.good);
  await expect(password).not.toHaveCSS('box-shadow', 'none');
  await form.getByRole('button', { name: 'Already have an account? Sign in', exact: true }).click();
  await expect(form).toHaveAttribute('data-mode', 'signin');
  await password.focus();
  await expectQuiet(password, colors.muted);
  await form.getByRole('link', { name: 'Forgot password?' }).click();
  const recovery = page.locator('#recoveryRequest input[type=email]');
  await recovery.fill('publisher@vacancy.test');
  await expect(recovery).toHaveCSS('outline-color', colors.accent);
  await expect(recovery).toHaveCSS('outline-width', '2px');
  await expect(recovery).toHaveCSS('border-top-color', colors.good);
  expect(state.authRequests).toEqual([]);
});

test('forced-colors mode preserves an explicit focus indicator', async ({ page, context }) => {
  const { email } = await openSignIn(page, context);
  await page.emulateMedia({ forcedColors: 'active' });
  await email.focus();
  await expect(email).toHaveCSS('outline-style', 'solid');
  await expect(email).toHaveCSS('outline-width', '2px');
});
