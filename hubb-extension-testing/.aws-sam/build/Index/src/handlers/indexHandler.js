// Import necessary modules or libraries
const audioFunction = require('./IndexAudioFunction');
const transcribeHandler = require('./IndexTranscribeFunction');
const chatGPTHandler = require('./IndexGPTSUMFunction');

// Lambda function handler
exports.handler = async (event, context) => {
  try {
    // Print the received event for debugging
    console.log('Received event:', JSON.stringify(event));

    const teamsUrl = event.teamsUrl;

    // Print the extracted teamsUrl for debugging
    console.log('Extracted teamsUrl:', teamsUrl);

    // Call the audio component's handler
    const audioResult = await audioFunction.handler(event, context);

    // Print the audioResult for debugging
    console.log('audioResult:', audioResult);

    // Call the transcribe component's handler
    const transcribeResult = await transcribeHandler.handler(event, context);

    // Print the transcribeResult for debugging
    console.log('transcribeResult:', transcribeResult);

    // Call the ChatGPT component's handler
    const chatGPTResult = await chatGPTHandler.handler(event, context);

    // Print the chatGPTResult for debugging
    console.log('chatGPTResult:', chatGPTResult);

    // Check for undefined results
    if (audioResult === undefined || transcribeResult === undefined || chatGPTResult === undefined) {
      throw new Error('One or more components returned undefined results.');
    }

    // Return combined results
    return {
      statusCode: 200,
      body: JSON.stringify({
        audioResult,
        transcribeResult,
        chatGPTResult
      })
    };
  } catch (error) {
    // Handle any errors that occur during processing
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'An error occurred during processing.', error: error.message })
    };
  }
};
