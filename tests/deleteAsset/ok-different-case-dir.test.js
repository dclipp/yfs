const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('deleteAsset', { status: TestDefinition.YfsStatus.OK }, '/folder2')
	.withPreparer((ctx) => ctx.createDirectory('/', 'FOLDER2'))