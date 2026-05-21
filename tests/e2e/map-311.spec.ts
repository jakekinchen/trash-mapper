import { expect, test } from '@playwright/test';

test('renders Austin 311 pollution hotspots on the map', async ({ page }) => {
  const response = await page.request.get('/api/reports/311');
  expect(response.ok()).toBe(true);

  const payload = await response.json();
  expect(payload.reports.length).toBeGreaterThan(0);
  expect(payload.reports[0].type).toBe('311');

  await page.goto('/');

  const filtersButton = page.getByRole('button', { name: 'Filters' });
  await expect(filtersButton).toBeVisible();
  await filtersButton.click();

  await expect(page.getByText(/311 Sourced Heatmap \([1-9][0-9]*/)).toBeVisible();
  await expect(page.getByTestId('austin-311-heatmap')).toBeVisible();

  await expect.poll(async () => {
    return page.getByTestId('austin-311-heatmap').evaluate((canvas) => {
      const heatmap = canvas as HTMLCanvasElement;
      const context = heatmap.getContext('2d');
      if (!context || heatmap.width === 0 || heatmap.height === 0) return 0;

      const { data } = context.getImageData(0, 0, heatmap.width, heatmap.height);
      let coloredPixels = 0;
      for (let index = 3; index < data.length; index += 4) {
        if (data[index] > 0) coloredPixels += 1;
      }
      return coloredPixels;
    });
  }).toBeGreaterThan(0);
});
