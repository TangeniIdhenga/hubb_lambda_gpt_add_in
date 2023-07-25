const axios = require('axios');
const AWS = require('aws-sdk'),
      {
        S3,
        waitUntilObjectExists
      } = require("@aws-sdk/client-s3");
const ffmpeg = require('fluent-ffmpeg');
AWS.config.update({ region: 'eu-west-2' });

const s3 = new S3();
exports.handler = async (event) => {
  try {
    const teamsUrl = event.teamsUrl;

    // Extract the video URL from the Teams URL
    const videoUrl = extractVideoUrl(teamsUrl);

    // Download the MP4 video file
    const videoData = await downloadVideo(videoUrl);

    // Convert the MP4 video to MP3 audio
    const audioBuffer = await convertToMP3(videoData);

    // Save the converted MP3 audio file to S3
    const s3Key = await saveToS3('hubb-microsoft-exten-dev', 'output.mp3', audioBuffer);

    // Delete the MP4 video file from S3 once the MP3 is created
    await deleteVideoFromS3(videoUrl);

    // Return the S3 key or any other relevant information
    return {
      statusCode: 200,
      body: s3Key,
    };
  } catch (error) {
    console.error('Error:', error); // Log the error
    return {
      statusCode: 500,
      body: error.message,
    };
  }
};

function extractVideoUrl(teamsUrl) {
  // Check if the Teams URL starts with 'https://teams.microsoft.com'
  if (teamsUrl.startsWith('https://teams.microsoft.com')) {
    // Extract the video ID from the Teams URL
    const videoId = teamsUrl.split('/meeting/')[1];

    // Video URL using the extracted video ID
    const videoUrl = `https://teams.microsoft.com/_#/media/conversation/${videoId}`;

    return videoUrl;
  }

  // Return the original Teams URL if it doesn't match the expected structure
  return teamsUrl;
}

async function downloadVideo(url) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'arraybuffer',
  });
  return response.data;
}

function convertToMP3(videoData) {
  return new Promise((resolve, reject) => {
    const buffers = [];
    ffmpeg(videoData)
      .toFormat('mp3')
      .on('error', (err) => reject(err))
      .on('data', (chunk) => buffers.push(chunk))
      .on('end', () => {
        const audioBuffer = Buffer.concat(buffers);
        resolve(audioBuffer);
      })
      .pipe();
  });
}

async function saveToS3(bucketName, key, data) {
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: data,
  };
  await s3.putObject(params);
  return key;
}

async function deleteVideoFromS3(videoUrl) {
  // Extract the video filename from the video URL
  const videoFilename = videoUrl.substring(videoUrl.lastIndexOf('/') + 1);

  const s3Params = {
    Bucket: 'hubb-microsoft-exten-dev',
    Key: videoFilename,
  };

  try {
    // Wait for the audio file to be saved in S3 before deleting the video file
    await waitUntilObjectExists({
      client: s3,
      maxWaitTime: 200
    }, s3Params);

    // Delete command to the S3 bucket
    await s3.deleteObject(s3Params);

    // Log a message indicating that the video has been deleted
    console.log(`Video '${videoFilename}' has been converted and deleted.`);
  } catch (error) {
    console.error(`Error deleting video '${videoFilename}':`, error); // Log the error
  }
}
