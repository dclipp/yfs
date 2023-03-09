const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('moveAsset', { status: TestDefinition.YfsStatus.AssetNotFound }, '/newFolder', '/folder2')
    .withPreparer((ctx) => ctx.createDirectory('/', 'newFolder'))