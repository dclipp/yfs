const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('renameAsset', { status: TestDefinition.YfsStatus.IllegalValue }, '/newFile1.txt', '$$file.txt')
	.withPreparer((ctx) => ctx.createFile('/', 'newFile1', 'txt'))