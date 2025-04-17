const express = require('express');
const { drive_v3 } = require('@googleapis/drive');
const { GoogleAuth } = require('google-auth-library');
const cors = require('cors');
const { Readable } = require('stream');
const { google } = require('googleapis');
const app = express();

app.use(express.json({ limit: '200mb' }));
app.use(cors());

// Validasi environment variable
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable tidak ditemukan');
}

// Inisialisasi autentikasi Google
let auth;
let drive;

try {
  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  
  // Validasi kredensial yang diperlukan
  const requiredFields = ['client_email', 'private_key', 'project_id'];
  const missingFields = requiredFields.filter(field => !credentials[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Kredensial tidak lengkap. Field yang hilang: ${missingFields.join(', ')}`);
  }

  auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });

  // Inisialisasi Drive dengan auth
  drive = new drive_v3.Drive({ auth });
  
  console.log('Google Drive API berhasil diinisialisasi');
} catch (error) {
  console.error('Error saat inisialisasi Google Auth:', error);
  throw error;
}

// Fungsi untuk mencari atau membuat folder
async function findOrCreateFolder(folderName, parentId = null) {
  try {
    console.log(`Mencari folder '${folderName}'${parentId ? ` di dalam folder ${parentId}` : ''}`);
    
    const query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${
      parentId ? ` and '${parentId}' in parents` : ''
    }`;
    
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, trashed, parents)',
      spaces: 'drive',
    });

    console.log(`Hasil pencarian untuk folder '${folderName}':`, JSON.stringify(response.data, null, 2));

    const folder = response.data.files[0];
    if (folder) {
      console.log(`Folder '${folderName}' ditemukan:`, folder);
      return folder.id;
    }

    console.log(`Folder '${folderName}' tidak ditemukan. Membuat folder baru...`);
    
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId && { parents: [parentId] }),
    };
    
    const newFolder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id',
    });
    
    console.log(`Folder baru '${folderName}' berhasil dibuat:`, newFolder.data);

    // Tambahkan permission untuk email yang ditentukan
    const permission = {
      type: 'user',
      role: 'writer',
      emailAddress: process.env.GOOGLE_DRIVE_SHARE_EMAIL || 'sutopouw@gmail.com',
    };
    
    await drive.permissions.create({
      fileId: newFolder.data.id,
      resource: permission,
    });
    
    console.log(`Folder '${folderName}' telah dibagikan ke ${permission.emailAddress}`);

    return newFolder.data.id;
  } catch (error) {
    console.error(`Error saat mengelola folder '${folderName}':`, error.message, error.stack);
    throw new Error(`Gagal mencari atau membuat folder '${folderName}': ${error.message}`);
  }
}

async function getOrCreateFolder(folderName) {
  try {
    const parentFolderId = await findOrCreateFolder('Seraya Store | Backup');
    const subFolderId = await findOrCreateFolder(folderName, parentFolderId);
    return subFolderId;
  } catch (error) {
    console.error('Error saat mendapatkan atau membuat folder:', error.message, error.stack);
    throw new Error(`Gagal mendapatkan atau membuat folder: ${error.message}`);
  }
}

const bufferToStream = (buffer) => {
  return Readable.from(buffer);
};

app.post('/backup', async (req, res) => {
  const { folderName, images } = req.body;

  if (!folderName || !images || images.length === 0) {
    return res.status(400).json({ 
      error: 'Data tidak lengkap',
      message: 'folderName dan images harus disediakan'
    });
  }

  try {
    console.log(`Memulai backup ${images.length} gambar ke folder '${folderName}'`);
    const folderId = await getOrCreateFolder(folderName);
    const uploadResults = [];
    const errors = [];

    for (const image of images) {
      const { id, dataURL } = image;

      // Validasi dataURL
      if (!dataURL || typeof dataURL !== 'string' || !dataURL.includes(',')) {
        const error = `Data gambar tidak valid untuk ID: ${id}`;
        console.error(error);
        errors.push({ id, error });
        continue;
      }

      try {
        const base64Data = dataURL.split(',')[1];
        if (!base64Data) {
          const error = `Data base64 tidak ditemukan untuk ID: ${id}`;
          console.error(error);
          errors.push({ id, error });
          continue;
        }

        const blob = Buffer.from(base64Data, 'base64');
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
        console.log(`Gambar ${id} berhasil di-backup ke Drive dengan ID: ${result.data.id}`);
      } catch (error) {
        console.error(`Error saat mengupload gambar ${id}:`, error);
        errors.push({ id, error: error.message });
      }
    }

    const response = {
      message: `Berhasil backup ${uploadResults.length} dari ${images.length} gambar`,
      results: uploadResults,
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    res.json(response);
  } catch (error) {
    console.error('Error saat backup:', error.message, error.stack);
    res.status(500).json({ 
      error: 'Gagal melakukan backup gambar', 
      message: error.message 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
