/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testMatch: ['**/__tests__/**/*.spec.ts'],
  collectCoverageFrom: ['**/*.ts', '!**/__tests__/**', '!index.ts'],
};
