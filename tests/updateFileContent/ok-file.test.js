const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('updateFileContent', { status: TestDefinition.YfsStatus.OK }, '/newFile1.txt', 'goodbye')
    .withPreparer((ctx) => ctx.createFile('/', 'newFile1', 'txt'))