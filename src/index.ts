import core = require('@actions/core');
import glob = require('@actions/glob');
import {
  parseTestResults,
  parseUtp
} from './parser';
import { env } from 'process';

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
    const testRunStatusIcon = testRunResult === 'Passed' ? '✅' : '❌';
    if (testResults.length > 1) {
      core.summary.addHeading(`${testRunStatusIcon} Test Run ${++totalTests} of ${testResults.length} ${testRunResult}`);
    } else {
      core.summary.addHeading(`${testRunStatusIcon} Test Run ${testRunResult}`);
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
    core.summary.addRaw(`\n`);
    const testSuite = testRun['test-suite'];
    if (Array.isArray(testSuite)) {
      for (const suite of testSuite) {
        core.summary.addRaw(getTestSuiteDetails(suite));
      }
    } else {
      core.summary.addRaw(getTestSuiteDetails(testSuite));
    }
    core.summary.write();
  }
}

/**
 * Prints the test suite summary as foldout section.
 * @param suite
 */
function getTestSuiteDetails(testSuite: any): string {
  let details: string = '';
  const childTestSuites = testSuite['test-suite'];
  if (childTestSuites !== undefined) {

    if (Array.isArray(childTestSuites)) {
      for (const suite of childTestSuites) {
        details += getTestSuiteDetails(suite);
      }
    } else {
      details += getTestSuiteDetails(childTestSuites);
    }
  }
  const childTestCases = testSuite['test-case'];
  if (childTestCases !== undefined) {
    if (Array.isArray(childTestCases)) {
      for (const testCase of childTestCases) {
        details += getTestCaseDetails(testCase);
      }
    } else {
      details += getTestCaseDetails(childTestCases);
    }
  }
  return details;
}

function getTestCaseDetails(testCase: any): string {
  const testCaseFullName = testCase['fullname'];
  const testCaseResult = testCase['result'];
  const testCaseResultIcon = testCaseResult === 'Passed' ? '✅' : '❌';
  const failure = testCase['failure'];
  let details = `${testCase['methodname']} (${testCase['duration']}s)\n\n`;
  if (failure) {
    const failureMessage = failure['message'];
    if (failureMessage) {
      details += `---\n${failure['message']}\n`;
    }
    const stackTrace = failure['stack-trace'];
    if (stackTrace) {
      details += `\`\`\`stacktrace\n${stackTrace}\n\`\`\`\n`;
    }
  }
  const utps = parseUtp(testCase['output']);
  const outputLines = utps.map((utp) => {
    core.info(JSON.stringify(utp, null, 2));
    // annotate failed test cases with the error message
    if (utp.type === 'TestStatus' && utp.phase === 'End' && utp.state === 5) {
      const unityProjectPath = `${env['UNITY_PROJECT_PATH'] || ''}/`.replace(/\\/g, '/');
      core.info(`UNITY_PROJECT_PATH: ${unityProjectPath}`);
      const workspacePath = `${env['GITHUB_WORKSPACE'] || ''}`.replace(/\\/g, '/');
      core.info(`GITHUB_WORKSPACE: ${workspacePath}`);
      const concatProjectPath = unityProjectPath.replace(workspacePath, '');
      core.info(`CONCAT_PROJECT_PATH: ${concatProjectPath}`);
      const utpFilePath = utp.fileName.replace(/\\/, /\//).replace(/$.\//, '');
      core.info(`UTP_FILE_PATH: ${utpFilePath}`);
      const filePath = `${concatProjectPath}${utpFilePath}`;
      core.info(`FILE_PATH: ${filePath}`);
      core.error(utp.message, { file: filePath, startLine: utp.lineNumber });
    }
    return utp.message;
  }).filter((line) => line !== undefined && line !== '');
  if (outputLines.length > 0) {
    details += '\n---\n';
    details += `\`\`\`log\n${outputLines.join('\n')}\n\`\`\`\n`;
  }
  return foldoutSection(`${testCaseResultIcon} ${testCaseFullName}`, details, testCaseResult !== 'Passed');
}

function foldoutSection(summary: string, body: string, isOpen: boolean): string {
  const open = isOpen ? ' open' : '';
  return `<details${open}>\n<summary>${summary}</summary>\n\n${body}\n</details>`;
}