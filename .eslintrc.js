module.exports = {
    extends: ['@nlib/eslint-config'],
    ignorePatterns: [
        'test/src',
        'test/test-*',
    ],
    env: {
        es6: true,
        node: true,
    },
    rules: {
        '@nlib/no-globals': 'off',
    },
};
