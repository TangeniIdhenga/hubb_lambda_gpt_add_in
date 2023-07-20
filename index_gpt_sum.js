// Imports
const AWS = require('aws-sdk');
const axios = require('axios');
const { clientId, tenantId } = require('./authConfig');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const s3 = new AWS.S3();

console.log(clientId);
console.log(tenantId);

// Configure the AWS region
AWS.config.update({ region: 'eu-west-2' });

// Azure AD application configuration
const config = {
  auth: {
    clientId: clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    clientSecret: '6d4497f8-4a05-435d-8b41-67a8acefa7e1' // Azure AD application client secret, not sure if this needs hiding 
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
    
    //extract S3 bucket name and JSON file key from the request body
    const bucketName = requestBody.bucketName;
    const jsonFileKey = requestBody.jsonFileKey;

    // Retrieve transcription JSON file content from Amazon S3
    const jsonFileContent = await retrieveJsonFileFromS3(bucketName, jsonFileKey);

    //convert the JSON file content to a transcription string
    const transcription = convertJsonToTranscription(jsonFileContent);

    // Generate the summarization using ChatGPT.v API in chunks
    const chunkSize = 5000; // Specify the chunk size that fits within the ChatGPT limit
    const chunks = chunkText(transcription, chunkSize);
    const summarization = await generateSummarization(chunks);

    //store meeting transcription and summarization in Amazon S3
    const transcriptionParams = {
      Bucket: bucketName,
      Key: 'meeting-transcription.txt',
      Body: transcription,
      ContentType: 'text/plain'
    };
    const summarizationParams = {
      Bucket: bucketName,
      Key: 'meeting-summarization.txt',
      Body: summarization,
      ContentType: 'text/plain'
    };

    await Promise.all([
      s3.putObject(transcriptionParams).promise(),
      s3.putObject(summarizationParams).promise()
    ]);

    //return a response indicating successful processing
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Meeting processed successfully' })
    };
  } catch (error) {
    //Handle any errors that occur during processing
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'An error occurred during processing' })
    };
  }
};

//Function to retrieve the transcription JSON file content from Amazon S3
const retrieveJsonFileFromS3 = async (bucketName, jsonFileKey) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: jsonFileKey
    };

    const response = await s3.getObject(params).promise();
    return response.Body.toString('utf-8');
  } catch (error) {
    console.error('Failed to retrieve transcription JSON file from S3:', error);
    throw error;
  }
};

//Function to convert the JSON file content to a transcription string
const convertJsonToTranscription = (jsonFileContent) => {
  try {
    const jsonContent = JSON.parse(jsonFileContent);
    return jsonContent.results.transcripts[0].transcript;
  } catch (error) {
    console.error('Failed to convert JSON to transcription:', error);
    throw error;
  }
};

// Function to chunk the text into smaller parts
const chunkText = (text, chunkSize) => {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize;
  }
  return chunks;
};

//Function to generate the summarization using ChatGPT.v API
const generateSummarization = async (chunks) => {
  const apiKey = 'ybnTtZiC3d5VJncQBJYrT3BlbkFJgzduaRh1YqDLa3ZqaIZM'; // ChatGPT.v API key
  const url = 'https://api.chatgpt.com/summarize/v1/summarize';

  let summary = '';
  for (const chunk of chunks) {
    try {
      const response = await axios.post(url, {
        texts: [chunk],
        model: 'gpt-3.5-turbo',
        max_tokens: 100
      }, {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      });

      summary += response.data.choices[0].text;
    } catch (error) {
      console.error('Failed to generate summarization:', error.response.data);
      throw error;
    }
  }

  return summary;
};
