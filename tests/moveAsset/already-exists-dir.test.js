const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('moveAsset', { status: TestDefinition.YfsStatus.AssetAlreadyExists }, '/newFolder', '/folder2')
    .withPreparer(
        (ctx) => ctx.createDirectory('/', 'folder2'))
    .withPreparer(
        (ctx) => ctx.createDirectory('/folder2', 'newFolder'))
    .withPreparer(
        (ctx) => ctx.createDirectory('/', 'newFolder'))