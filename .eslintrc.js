module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  env: {
    node: true,
    es6: true
  },
  rules: {
    // Disable rules that are too strict for this project
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    
    // Code quality rules
    'no-console': 'off', // Allow console logs for server logging
    'prefer-const': 'warn',
    'no-var': 'error',
    'no-multiple-empty-lines': ['warn', { max: 2 }],
    'no-trailing-spaces': 'warn',
    'eol-last': 'warn',
    
    // Import rules
    'no-unused-vars': 'off', // Handled by TypeScript
    
    // Async rules
    'require-await': 'off',
    '@typescript-eslint/require-await': 'off'
  },
  ignorePatterns: [
    'dist/**/*',
    'node_modules/**/*',
    '*.js'
  ]
};