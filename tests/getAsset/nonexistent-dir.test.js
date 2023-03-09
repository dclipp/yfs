const TestDefinition = require('../test-definition');

exports.default = TestDefinition.defineTest('getAsset', {
    output: {
        status: TestDefinition.YfsStatus.AssetNotFound,
        payload: null
    }
}, '/folder2');