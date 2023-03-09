const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('renameAsset', { status: TestDefinition.YfsStatus.IllegalValue }, '/newFolder', '//folder2')
	.withPreparer((ctx) => ctx.createDirectory('/', 'newFolder'))