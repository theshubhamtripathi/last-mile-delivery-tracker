/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleNameMapper: {
    '^@lmd/shared$': '<rootDir>/../../../packages/shared/src/index.ts',
    '^@lmd/shared/(.*)$': '<rootDir>/../../../packages/shared/src/$1',
  },
};
