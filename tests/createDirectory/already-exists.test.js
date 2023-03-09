const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('createDirectory', { status: TestDefinition.YfsStatus.AssetAlreadyExists }, '/', 'newFolder1')
    .withPreparer((ctx) => ctx.createDirectory('/', 'newFolder1'))