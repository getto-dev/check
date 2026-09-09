import { test, expect } from '@playwright/test';

test('Электрика: категория → поиск → позиция → цена → количество → смета → итог', async ({ page }) => {
  await page.goto('./');

  const profile = page.getByLabel('Профиль каталога');
  await expect(profile).toHaveValue('plumbing');
  await profile.selectOption('electrical');
  await expect(profile).toHaveValue('electrical');

  await page.getByRole('button', { name: 'Выбор категории' }).click();
  await page.getByRole('option', { name: 'Основные позиции' }).click();

  const search = page.getByRole('searchbox', { name: 'Поиск услуг и материалов' });
  await search.fill('Вырез подрозетников по бетону');

  const item = page.getByRole('button', { name: 'Открыть Вырез подрозетников по бетону' });
  await expect(item).toBeVisible();
  await expect(item.locator('xpath=..').getByText('450')).toBeVisible();

  await item.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Вырез подрозетников по бетону' })).toBeVisible();
  await expect(dialog.getByText('450').first()).toBeVisible();

  const quantity = dialog.getByRole('textbox', { name: 'Количество' });
  await quantity.fill('2.5');
  await quantity.blur();
  await expect(quantity).toHaveValue('2.5');
  await expect(dialog.getByText('1 125', { exact: false })).toBeVisible();

  await dialog.getByRole('button', { name: 'Добавить в смету' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Открыть смету' }).click();

  const estimateHeading = page.getByRole('heading', { name: 'Смета' });
  await expect(estimateHeading).toBeVisible();
  await expect(page.getByText('Вырез подрозетников по бетону', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Количество' })).toHaveValue('2.5');

  const totalLine = page.getByText('Итого', { exact: true }).locator('..');
  await expect(totalLine.getByText('1 125', { exact: false })).toBeVisible();
});
