// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'core',
      testEnvironment: 'node',
      transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
      testMatch: [
        '<rootDir>/src/core/**/__tests__/**/*.test.ts',
        '<rootDir>/src/db/**/__tests__/**/*.test.ts',
        '<rootDir>/src/export/**/__tests__/**/*.test.ts',
        '<rootDir>/desktop/**/__tests__/**/*.test.ts',
      ],
    },
    {
      displayName: 'app',
      preset: 'jest-expo',
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.tsx'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@shopify/react-native-skia|i18next|react-i18next|zustand)',
      ],
    },
  ],
};
