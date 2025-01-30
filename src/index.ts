import core = require('@actions/core');
import glob = require('@actions/glob');
import * as fs from "fs";
import {
  UnityTestResults,
  TestRun,
  TestSuite,
  TestCase,
  Property,
  Failure
} from './types';
import { XMLParser } from "fast-xml-parser";

const main = async () => {
  try {
    const testResultsInput = core.getInput('test-results');
    const testSuiteName = core.getInput('test-suite-name');
    core.info(`Gathering ${testSuiteName}...`);
    core.summary.addHeading(`${testSuiteName} Summary`);
    core.info(`test-results: ${testResultsInput}`);
    const globber = await glob.create(testResultsInput);
    const testResultFiles = await globber.glob();
    if (testResultFiles.length === 0) {
      core.warning('No test result files found!');
      return;
    }
    core.info(`Found ${testResultFiles.length} test result files:`);
    for (const file of testResultFiles) {
      core.info(file);
    }
    const tests: any[] = [];
    for (const file of testResultFiles) {
      let testResults: UnityTestResults;
      try {
        testResults = await tryParseTestResults(file);
      } catch (error) {
        core.error(error);
      }
      tests.push(testResults);
    }
    core.info(JSON.stringify(tests));
  } catch (error) {
    core.setFailed(error);
  }
}

main();

async function tryParseTestResults(file: string): Promise<any> {
  await fs.promises.access(file, fs.constants.R_OK);
  if (!file.endsWith('.xml')) {
    throw new Error(`${file} is not an xml file.`);
  }
  const contents = await fs.promises.readFile(file, 'utf8');
  const parser = new XMLParser();
  return parser.parse(contents);
}
