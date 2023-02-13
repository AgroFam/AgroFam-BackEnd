export default {
  globals: {
    'js-jest': {
      jsConfig: 'jsconfig.json',
      diagnostics: false,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  testRegex: '\\.test\\.js$',
  transform: {
    "^.+\\.js$": "babel-jest"
  },
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js', '!src/**/_tests_/**/*.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text-summary', 'text'],
};