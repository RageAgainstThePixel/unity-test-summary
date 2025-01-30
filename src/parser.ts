import * as fs from "fs";
import { XMLParser } from "fast-xml-parser";
import { TestRun } from "./types";

/**
 * Try to parse the test results.
 * @param file
 * @returns The parsed test results
 */
export async function parseTestResults(file: string): Promise<TestRun> {
  await fs.promises.access(file, fs.constants.R_OK);
  if (!file.endsWith('.xml')) {
    throw new Error(`${file} is not an xml file.`);
  }
  const contents = await fs.promises.readFile(file, 'utf8');
  const parser = new XMLParser({
    attributeNamePrefix: ``,
    ignoreAttributes: false,
  });
  const obj = parser.parse(contents);
  const testJson = JSON.stringify(obj['test-run'], null, 2);
  return JSON.parse(testJson) as TestRun;
}
