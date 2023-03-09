const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('renameAsset', { status: TestDefinition.YfsStatus.AssetAlreadyExists }, '/newFolder', 'folder2')
	.withPreparer((ctx) => ctx.createDirectory('/', 'FOLDER2'))
    .withPreparer((ctx) => ctx.createDirectory('/', 'newFolder'))