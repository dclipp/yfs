const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('assetExists', {
    output: {
        status: TestDefinition.YfsStatus.OK,
        payload: true
    }
}, '/folder2')
    .withPreparer((ctx) => ctx.createDirectory('/', 'folder2'))