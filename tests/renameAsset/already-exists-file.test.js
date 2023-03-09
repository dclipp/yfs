const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('renameAsset', { status: TestDefinition.YfsStatus.AssetAlreadyExists }, '/newFile1.txt', 'renamed.txt')
	.withPreparer((ctx) => ctx.createFile('/', 'newFile1', 'txt'))
    .withPreparer((ctx) => ctx.createFile('/', 'renamed', 'txt'))