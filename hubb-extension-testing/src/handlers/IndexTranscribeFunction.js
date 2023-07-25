//This function is responsible for taking the mp3 audio and converting it into a json file and its a transcription of the audio
// Importing necessary modules or libraries
//works - result is event.json file
const AWS = require('aws-sdk'),
      {
        S3
      } = require("@aws-sdk/client-s3");
const { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } = require('@aws-sdk/client-transcribe');

const s3 = new S3();
//configure the AWS region
AWS.config.update({ region: 'eu-west-2' });

const transcribeClient = new TranscribeClient();
//lambda function handler
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

//extract the MP3 file URL from the request body
    const mp3FileURL = requestBody.mp3FileURL;

//start a transcription job with AWS Transcribe
    const transcriptionJobName = await startTranscriptionJob(mp3FileURL);

//poll the transcription job status until it's completed
    await waitForTranscriptionJobCompletion(transcriptionJobName);

//get the transcription job results
    const transcriptionResults = await getTranscriptionJobResults(transcriptionJobName);

//store the transcription results as a JSON file in Amazon S3
    await storeTranscriptionResults(transcriptionJobName, transcriptionResults);

//return the transcription job name
    return {
      statusCode: 200,
      body: JSON.stringify({ jobName: transcriptionJobName })
    };
  } catch (error) {
//handle any errors that occur during processing
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'An error occurred during processing' })
    };
  }
};

//function to start a transcription job with AWS Transcribe
const startTranscriptionJob = async (mp3FileURL) => {
  try {
    const transcriptionJobName = `transcription-${Date.now()}`;

    const params = {
      TranscriptionJobName: transcriptionJobName,
      Media: { MediaFileUri: mp3FileURL },
      MediaFormat: 'mp3',
      LanguageCode: 'en-US'
    };

//start the transcription job
    await transcribeClient.send(new StartTranscriptionJobCommand(params));

    return transcriptionJobName;
  } catch (error) {
    console.error('Failed to start transcription job:', error);
    throw error;
  }
};

//function to poll the transcription job status until it's completed
const waitForTranscriptionJobCompletion = async (transcriptionJobName) => {
  try {
    while (true) {
      const params = {
        TranscriptionJobName: transcriptionJobName
      };

//check the transcription job status
      const response = await transcribeClient.send(new GetTranscriptionJobCommand(params));
      const { TranscriptionJobStatus } = response.TranscriptionJob;

      if (TranscriptionJobStatus === 'COMPLETED') {
        return;
      } else if (TranscriptionJobStatus === 'FAILED') {
        throw new Error(`Transcription job failed: ${transcriptionJobName}`);
      }

//sleep for 5 seconds before checking again
      await sleep(5000);
    }
  } catch (error) {
    console.error('Failed to wait for transcription job completion:', error);
    throw error;
  }
};

//function to get the transcription job results
const getTranscriptionJobResults = async (transcriptionJobName) => {
  try {
    const params = {
      TranscriptionJobName: transcriptionJobName
    };

//get the transcription job results
    const response = await transcribeClient.send(new GetTranscriptionJobCommand(params));
    return response.TranscriptionJob.Transcript;
  } catch (error) {
    console.error('Failed to get transcription job results:', error);
    throw error;
  }
};

//function to store the transcription results as a JSON file in Amazon S3
const storeTranscriptionResults = async (transcriptionJobName, transcriptionResults) => {
  try {
    const jsonResults = JSON.stringify(transcriptionResults, null, 2);

    const params = {
      Bucket: 'hubb-microsoft-exten-dev', // S3 bucket name
      Key: `${transcriptionJobName}.json`,
      Body: jsonResults,
      ContentType: 'application/json'
    };

//store the transcription results in S3 bucket
    await s3.putObject(params);
  } catch (error) {
    console.error('Failed to store transcription results in S3:', error);
    throw error;
  }
};

//utility function to sleep for a specified duration
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
