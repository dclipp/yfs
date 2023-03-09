const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('deleteAsset', { status: TestDefinition.YfsStatus.OK }, '/newFile1.txt')
    .withPreparer((ctx) => ctx.createFile('/', 'newFile1', 'txt'))
    .withVerifier({
        expectedOutcomeType: 'bool',
        expectedOutcome: false,
        verifier: async (ctx) => {
            const o = await ctx.assetExists('/newFile1.txt');
            return o.payload === false;
        }
    })
