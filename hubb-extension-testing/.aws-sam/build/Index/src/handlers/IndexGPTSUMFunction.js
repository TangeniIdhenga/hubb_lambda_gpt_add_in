//This component is responsible for the chatgpt conversion once it is able to pull the aquired transcription from the S3 bucket and convert it into a summarization 
//also runs the microsoft teams api making the teams bot functionable
// Importing necessary modules or libraries
//needs fixing not important for the moment 
const AWS = require('aws-sdk');
const axios = require('axios');
const { clientId, tenantId } = require('./authConfig');
const { ConfidentialClientApplication } = require('@azure/msal-node');


const s3 = new AWS.S3();

console.log(clientId);
console.log(tenantId);


AWS.config.update({ region: 'eu-west-2' });

// Azure AD application configuration
const config = {
  auth: {
    clientId: clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    clientSecret: '6d4497f8-4a05-435d-8b41-67a8acefa7e1' // Azure AD application client secret
  }
};

const pca = new ConfidentialClientApplication(config);

// Lambda function handler
exports.handler = async (event, context) => {
  try {
    //parse the event body as JSON
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      console.error('Failed to parse request body:', error);
      throw new Error('Invalid request body');
    }
    
    // Extract the meeting URL from the request body
     const meetingURL = requestBody.message.text;

    // Retrieve the meeting transcription from the Microsoft Teams API
    const meetingTranscription = await getMeetingTranscription(meetingURL);

    // Generate the summarization using ChatGPT.v API
    const summarization = await generateSummarization(meetingTranscription);

    // Store the meeting transcription and summarization in Amazon S3 (NOT SUPPOSED TO PUT SUM IN S3)
    const transcriptionParams = {
      Bucket: 'hubb-microsoft-exten-dev', // S3 bucket name
      Key: 'meeting-transcription.txt',
      Body: meetingTranscription,
      ContentType: 'text/plain'
    };
    const summarizationParams = {
      Bucket: 'hubb-microsoft-exten-dev', // S3 bucket name
      Key: 'meeting-summarization.txt',
      Body: summarization,
      ContentType: 'text/plain'
    };

    await Promise.all([
      s3.putObject(transcriptionParams).promise(),
      s3.putObject(summarizationParams).promise()
    ]);

    // Return a response indicating successful processing
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Meeting processed successfully' })
    };
  } catch (error) {
    // Handle any errors that occur during processing
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'An error occurred during processing' })
    };
  }
};

//function to retrieve the meeting transcription from the Microsoft Teams API
const getMeetingTranscription = async (meetingURL) => {
  try {
    const authResult = await pca.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default']
    });

    const accessToken = authResult.accessToken;
    const graphApiUrl = `https://graph.microsoft.com/v1.0/${encodeURIComponent(meetingURL)}/transcriptions`;

    const response = await axios.get(graphApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    //extract the transcription data from response and return the meeting transcription content
    return response.data.transcription.content;
  } catch (error) {
    console.error('Failed to retrieve meeting transcription:', error.response.data);
    throw error;
  }
};

//function to generate the summarization using ChatGPT.v API
const generateSummarization = async (text) => {
  const apiKey = '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'; // ChatGPT API key
  const url = 'https://api.chatgpt.com/summarize/v1/summarize';

  try {
    const response = await axios.post(url, {
      texts: [text],
      model: 'gpt-3.5-turbo',
      max_tokens: 100
    }, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    return response.data.choices[0].text;
  } catch (error) {
    console.error('Failed to generate summarization:', error.response.data);
    throw error;
  }
};
