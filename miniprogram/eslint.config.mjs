import tseslint from 'typescript-eslint';

export default tseslint.config({ ignores: ['miniprogram_npm'] }, ...tseslint.configs.recommended, {
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
  },
});
