const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('getAsset', {
    output: {
        status: TestDefinition.YfsStatus.OK,
        payload: {
            $partial: true,
            isDirectory: true,
            publicName: 'folder2'
        }
    }
}, '/FOLDER2')
    .withPreparer(
        (ctx) => ctx.createDirectory('/', 'folder2')
    )