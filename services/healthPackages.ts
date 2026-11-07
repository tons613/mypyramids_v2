export type PackageTest = {
  id: string | number;
  testname: string;
  category?: { testcategory?: string } | string | null;
};

export type HealthPackage = {
  id: string | number;
  name: string;
  price: number | null;
  description: string;
  subheading: string;
  image: string;
  test_count: number;
  tests: PackageTest[];
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function validId(value: unknown): value is string | number {
  return (typeof value === 'string' && value.trim().length > 0) ||
    (typeof value === 'number' && Number.isFinite(value));
}

export function readHealthPackages(payload: unknown): HealthPackage[] {
  const envelope = record(payload);
  const data = record(envelope?.data) ?? envelope;
  const packages = Array.isArray(payload) ? payload : data?.packages ?? data?.items ?? data?.health_packages;
  if (!Array.isArray(packages)) throw new Error('The health packages response was incomplete.');

  return packages.map((value) => {
    const pkg = record(value);
    if (!pkg || !validId(pkg.id) || typeof pkg.name !== 'string' || !pkg.name.trim()) {
      throw new Error('A health package is missing its name or ID.');
    }
    const testList = pkg.test_list ?? [];
    if (!Array.isArray(testList)) throw new Error('The package test list was incomplete.');
    const tests = testList.map((entry): PackageTest => {
      const test = record(record(entry)?.testdata);
      if (!test || !validId(test.id) || typeof test.testname !== 'string') {
        throw new Error('An included test is missing its name or ID.');
      }
      const category = record(test.category);
      return {
        id: test.id,
        testname: test.testname,
        category: typeof test.category === 'string'
          ? test.category
          : category && typeof category.testcategory === 'string'
            ? { testcategory: category.testcategory }
            : null,
      };
    });
    const price = (typeof pkg.price === 'number' || typeof pkg.price === 'string') && String(pkg.price).trim()
      ? Number(pkg.price)
      : NaN;
    return {
      id: pkg.id,
      name: pkg.name,
      price: Number.isFinite(price) && price > 0 ? price : null,
      description: typeof pkg.description === 'string' ? pkg.description : '',
      subheading: typeof pkg.subheading === 'string' ? pkg.subheading : '',
      image: typeof pkg.image === 'string' ? pkg.image : '',
      test_count: typeof pkg.test_count === 'number' && Number.isInteger(pkg.test_count) && pkg.test_count >= 0
        ? pkg.test_count : tests.length,
      tests,
    };
  });
}
