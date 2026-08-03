export const SOURCE_FILE_TYPES = ['exa', 'add', 'inv'];
export const FILTER_CATEGORIES = ['ICT', 'ENG', 'BAT', 'HRGA', 'Kosong'];

export function getSourceFileCount(files) {
  return SOURCE_FILE_TYPES.filter((type) => Boolean(files?.[type])).length;
}

export function canExtractFilters(files) {
  return getSourceFileCount(files) > 0;
}

export function classifyBat(value) {
  const raw = String(value ?? '').trim();
  const upper = raw.toUpperCase();

  if (!raw || upper === 'NAN' || upper === 'NONE') return 'Kosong';
  if (upper.startsWith('ICT')) return 'ICT';
  if (upper.startsWith('ENG')) return 'ENG';
  if (upper.startsWith('HRGA')) return 'HRGA';
  if (upper.startsWith('BAT')) return 'BAT';

  return 'BAT';
}

export function countBatsByCategory(bats) {
  return FILTER_CATEGORIES.reduce((counts, category) => {
    const count = bats.filter((bat) => classifyBat(bat) === category).length;
    return { ...counts, [category]: count };
  }, {});
}

export function selectedBatsForCategory(bats, category) {
  return bats.filter((bat) => classifyBat(bat) === category);
}

export function getEffectiveBats(bats, selectedCategories) {
  if (!selectedCategories.length) return [];

  return selectedCategories.flatMap((category) => selectedBatsForCategory(bats, category));
}
