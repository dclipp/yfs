const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('assetExists', {
    output: {
        status: TestDefinition.YfsStatus.OK,
        payload: true
    }
}, '/newFile1.txt')
    .withPreparer((ctx) => ctx.createFile('/', 'newFile1', 'txt'))