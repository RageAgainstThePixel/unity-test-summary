export interface UnityTestResults {
  testRun: TestRun;
}

export interface TestRun {
  id: string;
  testcasecount: string;
  result: string;
  total: string;
  passed: string;
  failed: string;
  inconclusive: string;
  skipped: string;
  asserts: string;
  engineVersion: string;
  clrVersion: string;
  startTime: string;
  endTime: string;
  duration: string;
  testSuite: TestSuite[];
}

export interface TestSuite {
  type: string;
  id: string;
  name: string;
  fullname: string;
  runstate: string;
  testcasecount: string;
  result: string;
  site: string;
  startTime: string;
  endTime: string;
  duration: string;
  total: string;
  passed: string;
  failed: string;
  inconclusive: string;
  skipped: string;
  asserts: string;
  properties?: Property[];
  failure?: Failure;
  testSuite?: TestSuite[];
  testCase?: TestCase[];
}

export interface Property {
  name: string;
  value: string;
}

export interface TestCase {
  id: string;
  name: string;
  fullname: string;
  methodname: string;
  classname: string;
  runstate: string;
  seed: string;
  result: string;
  startTime: string;
  endTime: string;
  duration: string;
  asserts: string;
  properties?: Property[];
  failure?: Failure;
  output?: string;
}

export interface Failure {
  message: string;
  stackTrace?: string;
}
