import { expect, test } from '@playwright/test';

const austin311Fixture = {
  reports: [
    {
      id: '311-test-1',
      location: [30.2657, -97.7313],
      type: '311',
      severity: 3,
      description: 'TPW - Debris in Street (Open)',
      timestamp: '2026-05-20T23:52:00.000',
      cleaned_up: false,
    },
    {
      id: '311-test-2',
      location: [30.2662, -97.7308],
      type: '311',
      severity: 3,
      description: 'TPW - Debris in Street (Open)',
      timestamp: '2026-05-20T22:18:00.000',
      cleaned_up: false,
    },
    {
      id: '311-test-3',
      location: [30.2649, -97.7321],
      type: '311',
      severity: 2,
      description: 'TPW - Debris in Street (Closed)',
      timestamp: '2026-05-19T18:30:00.000',
      cleaned_up: true,
    },
    {
      id: '311-test-4',
      location: [30.2340, -97.7691],
      type: '311',
      severity: 3,
      description: 'ARR - Storm Debris Collection (Open)',
      timestamp: '2026-05-18T15:45:00.000',
      cleaned_up: false,
    },
  ],
  sourceCount: 4,
  skippedCount: 0,
  fetchedAt: '2026-05-21T12:00:00.000Z',
  lookbackDays: 90,
};

test('renders Austin 311 pollution hotspots on the map', async ({ page }) => {
  await page.route('**/api/reports/311', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(austin311Fixture),
    });
  });

  await page.goto('/');

  await expect(page.getByTestId('skyfi-panel')).toBeVisible();
  await expect(page.getByText('SkyFi Intelligence')).toBeVisible();
  await expect(page.getByTestId('skyfi-panel').getByText('AOI-01')).toBeVisible();

  const filtersButton = page.getByRole('button', { name: 'Filters' });
  await expect(filtersButton).toBeVisible();
  await filtersButton.click();

  await expect(page.getByText(/311 Sourced Heatmap \([1-9][0-9]*/)).toBeVisible();
  await expect(page.getByTestId('austin-311-heatmap')).toBeVisible();
  await expect(page.getByTestId('skyfi-aoi-overlay')).toBeVisible();

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

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export AOIs' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('trashmapatx-skyfi-aois.geojson');
});
