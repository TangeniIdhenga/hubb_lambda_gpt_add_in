const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { fromIni } = require("@aws-sdk/credential-provider-ini");
const { defaultProvider } = require("@aws-sdk/credential-provider-node");

const lambda = new LambdaClient({
  region: "eu-west-2",
  credentials: fromIni({
    profile: "Tangeni", 
    credentialProvider: defaultProvider({
      timeout: 5000, // Optional timeout value
    }),
  }),
});

const testAudioConversion = async () => {
  const input = {
    teamsUrl: 'https://hubbinsurecom-my.sharepoint.com/:v:/g/personal/ulrich_zink_hubbinsure_com/EZV-AbRnXclGvjv_Ck_LkvQBjDh9Qm-7aeMlAUrb73wL1Q?e=kfRwdB',
  };

  // Lambda function name
  const functionName = 'hubb-microsoft-teams-extension';
  const params = {
    FunctionName: functionName,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(input),
  };

  try {
    // Invoke the Lambda function
    const response = await lambda.send(new InvokeCommand(params));

    // Extract the statusCode and body from the response
    const { StatusCode, Payload } = response;

    // Handle the response
    if (StatusCode === 200) {
      console.log('Audio conversion successful.');
      console.log('Response:', Payload);
    } else {
      console.log('Audio conversion failed.');
      console.log('Error:', Payload);
    }
  } catch (error) {
    console.log('Error invoking Lambda function:', error);
  }
};

// Invoke the test function
testAudioConversion();
