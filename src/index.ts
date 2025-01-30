import core = require('@actions/core');
import glob = require('@actions/glob');
import {
  parseTestResults
} from './parser';

const main = async () => {
  try {
    const testResultsInput = core.getInput('test-results');
    const testSuiteName = core.getInput('test-suite-name');
    core.info(`Gathering ${testSuiteName}...`);
    core.summary.addHeading(`${testSuiteName} Summary`);
    core.info(`test-results:\n  > ${testResultsInput}`);
    const globber = await glob.create(testResultsInput);
    const testResultFiles = await globber.glob();
    if (testResultFiles.length === 0) {
      core.warning('No test result files found!');
      return;
    }
    core.info(`Found ${testResultFiles.length} test result files:`);
    for (const file of testResultFiles) {
      core.info(`  > ${file}`);
    }
    const testResults: any[] = [];
    for (const file of testResultFiles) {
      try {
        testResults.push(await parseTestResults(file));
      } catch (error) {
        core.error(error);
      }
    }
    for (const testResult of testResults) {
      core.info(JSON.stringify(testResult, null, 2));
    }
    printTestSummary(testResults);
  } catch (error) {
    core.setFailed(error);
  }
}

main();

/**
 * Prints the test summaries as markdown for the GitHub Actions Summary.
 * Similar to unity test runner, where each assembly and test suite is a foldout section, with the test results inside.
 * Each fold out section has a green checkmark or red x, depending on the test results.
 * Users can click on the foldout section to see the test results with the printed details of that specific test fixture.
 * We will also print annotations for failed tests with the error message.
 * @param testResults
 */
function printTestSummary(testResults: any[]) {
  let totalTests = 0;
  for (const testRun of testResults) {
    const testRunResult = testRun['result'].replace(/\s*\(.*?\)\s*/g, '');
    const testRunDuration = testRun['duration'];
    const testRunTotalTests = testRun['total'] as number;
    const testRunPassedTests = testRun['passed'] as number;
    const testRunFailedTests = testRun['failed'] as number;
    const testRunInconclusiveTests = testRun['inconclusive'] as number;
    const testRunSkippedTests = testRun['skipped'] as number;
    const testRunAsserts = testRun['asserts'] as number;
    if (testResults.length > 1) {
      core.summary.addHeading(`Test Run ${++totalTests} of ${testResults.length} ${testRunResult}`);
    } else {
      core.summary.addHeading(`Test Run ${testRunResult}`);
    }
    core.summary.addRaw(`\n| ${testRunTotalTests} | Total Tests Run |\n`);
    core.summary.addRaw(`|---|---|\n`);
    core.summary.addRaw(`|🕑| ${testRunDuration} |\n`);
    core.summary.addRaw(`|✅| ${testRunPassedTests} passed |\n`);
    core.summary.addRaw(`|❌| ${testRunFailedTests} failed |\n`);
    if (testRunAsserts > 0) {
      core.summary.addRaw(`|🚩| ${testRunAsserts} asserts |\n`);
    }
    if (testRunSkippedTests > 0) {
      core.summary.addRaw(`|⏭️| ${testRunSkippedTests} skipped |\n`);
    }
    if (testRunInconclusiveTests > 0) {
      core.summary.addRaw(`|❔| ${testRunInconclusiveTests} inconclusive |\n`);
    }

    core.summary.write();
  }
}