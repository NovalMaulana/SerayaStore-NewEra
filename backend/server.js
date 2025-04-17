const express = require('express');
const { drive_v3 } = require('@googleapis/drive');
const { GoogleAuth } = require('google-auth-library');
const cors = require('cors');
const { Readable } = require('stream');
const app = express();

app.use(express.json({ limit: '200mb' }));
app.use(cors());

// Inisialisasi GoogleAuth dengan credentials dari environment variable
let auth;
console.log('Checking for GOOGLE_APPLICATION_CREDENTIALS_JSON:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    console.log('Successfully parsed credentials from environment variable');
    auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
  } catch (error) {
    console.error('Error parsing credentials from environment variable:', error);
    throw error;
  }
} else {
  console.log('Using keyFile instead of environment variable');
  auth = new GoogleAuth({
    keyFile: './service-account.json',
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

// Inisialisasi Drive dengan auth
const drive = new drive_v3.Drive({ auth });

// Fungsi untuk mencari atau membuat folder
async function findOrCreateFolder(folderName, parentId = null) {
  try {
    console.log(`Searching for folder '${folderName}'${parentId ? ` under parent ${parentId}` : ''}`);
    const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${
      parentId ? ` and '${parentId}' in parents` : ''
    }`;
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, trashed, parents)',
      spaces: 'drive',
    });

    console.log(`API response for '${folderName}':`, JSON.stringify(response.data, null, 2));

    const folder = response.data.files[0];
    if (folder) {
      console.log(`Folder '${folderName}' found:`, folder);
      return folder.id;
    }

    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId && { parents: [parentId] }),
    };
    const newFolder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });
    console.log(`New folder '${folderName}' created:`, newFolder.data);

    const permission = {
      type: 'user',
      role: 'writer',
      emailAddress: 'sutopouw@gmail.com', // GANTI DENGAN EMAIL ANDA
    };
    await drive.permissions.create({
      fileId: newFolder.data.id,
      resource: permission,
    });
    console.log(`Folder '${folderName}' shared with ${permission.emailAddress}`);

    return newFolder.data.id;
  } catch (error) {
    console.error(`Error in findOrCreateFolder for '${folderName}':`, error.message, error.stack);
    throw new Error(`Failed to find or create folder '${folderName}': ${error.message}`);
  }
}

async function getOrCreateFolder(folderName) {
  try {
    const parentFolderId = await findOrCreateFolder('Seraya Store | Backup');
    const subFolderId = await findOrCreateFolder(folderName, parentFolderId);
    return subFolderId;
  } catch (error) {
    console.error('Error in getOrCreateFolder:', error.message, error.stack);
    throw new Error(`Failed to get or create folder: ${error.message}`);
  }
}

const bufferToStream = (buffer) => {
  return Readable.from(buffer);
};

app.post('/backup', async (req, res) => {
  const { folderName, images } = req.body;

  if (!folderName || !images || images.length === 0) {
    return res.status(400).json({ error: 'Missing folderName or images' });
  }

  try {
    const folderId = await getOrCreateFolder(folderName);
    const uploadResults = [];

    for (const image of images) {
      const { id, dataURL } = image;

      // Validasi dataURL
      if (!dataURL || typeof dataURL !== 'string' || !dataURL.includes(',')) {
        console.error(`Invalid dataURL for image ${id}: ${dataURL}`);
        continue; // Lewati gambar yang tidak valid
      }

      let blob;
      try {
        const base64Data = dataURL.split(',')[1];
        if (!base64Data) {
          console.error(`No base64 data found in dataURL for image ${id}`);
          continue;
        }
        blob = Buffer.from(base64Data, 'base64');
      } catch (error) {
        console.error(`Error decoding dataURL for image ${id}: ${error.message}`);
        continue;
      }

      const stream = bufferToStream(blob);
      const fileMetadata = {
        name: `${id}-${Date.now()}.png`,
        parents: [folderId],
      };
      const media = {
        mimeType: 'image/png',
        body: stream,
      };
      const result = await drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id',
      });
      uploadResults.push({ id: image.id, driveId: result.data.id });
    }

    res.json({ message: `Successfully backed up ${uploadResults.length} images`, results: uploadResults });
  } catch (error) {
    console.error('Backup error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to backup images', details: error.message });
  }
});

app.listen(3001, () => {
  console.log('Backend running on http://localhost:3001');
});
