const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('renameAsset', { status: TestDefinition.YfsStatus.OK }, '/newFolder', 'folder2')
	.withPreparer((ctx) => ctx.createDirectory('/', 'newFolder'))