// Import helloFromLambdaHandler function from hello-from-lambda.mjs
import { index_gpt_sam } from '../../../src/handlers/IndexGPTSUMFunction.js';

// This includes all tests for helloFromLambdaHandler()
describe('Test for index_gpt_sam', function () {
    // This test invokes helloFromLambdaHandler() and compare the result 
    it('Verifies successful response', async () => {
        // Invoke helloFromLambdaHandler()
        const result = await index_gpt_sam();
        /* 
            The expected result should match the return from your Lambda function.
            e.g. 
            if you change from `const message = 'Hello from Lambda!';` to `const message = 'Hello World!';` in hello-from-lambda.mjs
            you should change the following line to `const expectedResult = 'Hello World!';`
        */
        const expectedResult = 'Hello from Lambda!';
        // Compare the result with the expected result
        expect(result).toEqual(expectedResult);
    });
});
