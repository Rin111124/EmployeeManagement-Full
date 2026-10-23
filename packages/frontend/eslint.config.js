import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

/**
 * ESLint config cho Admin Frontend (Giai đoạn 5)
 *
 * Trước đây `npm run lint` chỉ chạy `tsc --noEmit` — không phải ESLint thật.
 * Config này thêm:
 *  - TypeScript type-aware rules
 *  - React Hooks rules (missing deps, rules of hooks)
 *  - React Refresh (HMR safety)
 *  - Cấm console.log trong production code
 *  - Enforce dùng === thay vì ==
 */
export default [
    // Bỏ qua build output và generated files
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'coverage/**',
            '*.config.ts',
            '*.config.js',
            'e2e/**',
        ],
    },

    // Cấu hình cho TypeScript source files
    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
                ecmaVersion: 2022,
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...globals.browser,
                ...globals.es2022,
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            // TypeScript rules
            ...tsPlugin.configs.recommended.rules,
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            }],
            '@typescript-eslint/no-non-null-assertion': 'warn',

            // React Hooks rules — bắt buộc để tránh stale closure bugs
            ...reactHooks.configs.recommended.rules,

            // React Refresh — cần cho HMR đúng cách
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],

            // Chung
            'eqeqeq': ['error', 'always'],           // Bắt buộc === thay vì ==
            'no-console': ['warn', {                   // Cảnh báo console.log trong prod code
                allow: ['warn', 'error'],
            }],
            'no-debugger': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
        },
    },
];
