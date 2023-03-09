const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('moveAsset', { status: TestDefinition.YfsStatus.OK }, '/newFile1.txt', '/folder2')
    .withPreparer(
        (ctx) => ctx.createDirectory('/', 'folder2')
    )
    .withPreparer(
        (ctx) => ctx.createFile('/', 'newFile1', 'txt')
    )