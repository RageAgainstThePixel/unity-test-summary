import { parseTestResults } from '../src/parser';
import { TestRun } from '../src/types';

describe('tryParseTestResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse StandaloneLinux64-results.xml', async () => {
    const result: TestRun = await parseTestResults('./tests/StandaloneLinux64-results.xml');
    console.log(JSON.stringify(result, null, 2));
    expect(result).toBeDefined();
    expect(result).toHaveProperty('id');
  });
});