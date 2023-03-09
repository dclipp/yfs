const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('moveAsset', { status: TestDefinition.YfsStatus.AssetAlreadyExists }, '/newFile1.txt', '/folder2')
    .withPreparer(
        (ctx) => ctx.createDirectory('/', 'folder2'))
    .withPreparer(
        (ctx) => ctx.createFile('/folder2', 'newFile1', 'txt'))
    .withPreparer(
        (ctx) => ctx.createFile('/', 'newFile1', 'txt'))