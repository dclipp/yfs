const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('moveAsset', { status: TestDefinition.YfsStatus.AssetNotFound }, '/newFile1.txt', '/folder2')
    .withPreparer(
        (ctx) => ctx.createDirectory('/', 'folder2')
    )