const express = require('express');
const app = express();
const port = 9999;
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpegStatic = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');

// Set the path to the ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegStatic);

const inputUrl = 'https://campaign.salla.media/campaign_media/snapchat/21vFM1Q8AP1Jh5IMDs1Z7DQFPNsyxittSLzfvfqI.mp4';
const localInputPath = path.join(__dirname, 'media.mp4');
const outputDir = path.join(__dirname, 'public', 'chunks');

// Function to download the media file locally
async function downloadMedia(url, filePath) {
  const writer = fs.createWriteStream(filePath);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

app.get('/', async (req, res) => {
  try {
    // Download the video to a local file
    console.log('Downloading video...');
    await downloadMedia(inputUrl, localInputPath);
    console.log('Download complete.');

    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Chunk the video into 10-second segments
    console.log('Chunking video...');
    ffmpeg(localInputPath)
      .output(`${outputDir}/chunk_%03d.mp4`) // Create chunk files like chunk_001.mp4, chunk_002.mp4
      .videoCodec('libx264')                 // Convert to H.264
      .audioCodec('aac')                     // Convert audio to AAC
      .format('segment')                     // Segment the video
      .outputOptions('-segment_time', '10')  // Set segment time to 10 seconds
      .on('end', () => {
        console.log('Chunking complete.');
        res.send('Video chunked into 10-second segments successfully!');
      })
      .on('error', (err) => {
        console.error('Error during chunking:', err.message);
        res.status(500).send('Error during chunking.');
      })
      .run();
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).send('Error during processing.');
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

