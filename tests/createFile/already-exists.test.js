const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('createFile', { status: TestDefinition.YfsStatus.AssetAlreadyExists }, '/', 'newFile1', 'txt')
	.withPreparer((ctx) => ctx.createFile('/', 'newFile1', 'txt'))