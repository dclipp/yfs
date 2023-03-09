const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('getAsset', {
    output: {
        status: TestDefinition.YfsStatus.OK,
        payload: {
            $partial: true,
            isDirectory: true,
            publicName: 'symfolder'
        }
    }
}, '/symfolder')
    .withPreparer(
        (ctx) => ctx.createDirectory('/', 'folder2')
    )
    .withPreparer(
        (ctx) => ctx.createDirectory('/folder2', 'inner')
    )
    .withPreparer(
        (ctx) => ctx.createSymlink('/', 'symfolder', '/folder2/inner')
    )