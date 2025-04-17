const express = require('express');
const { drive_v3 } = require('@googleapis/drive');
const { GoogleAuth } = require('google-auth-library');
const cors = require('cors');
const { Readable } = require('stream');
const { google } = require('googleapis');
const app = express();

app.use(express.json({ limit: '200mb' }));
app.use(cors());

// Validasi environment variables yang diperlukan
const requiredEnvVars = [
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_PROJECT_ID'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(`Environment variable berikut tidak ditemukan: ${missingEnvVars.join(', ')}`);
}

// Inisialisasi autentikasi Google
let auth;
let drive;

try {
  // Buat objek credentials dari environment variables terpisah
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    .replace(/\\n/g, '\n')
    .replace(/["']/g, '')
    .trim();

  const credentials = {
    type: 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: 'b126cef6993649f1c611e44828988c79bd369550',
    private_key: privateKey,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: '116761857650894053624',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/serayastore%40webhookbackuo.iam.gserviceaccount.com'
  };

  // Debug log untuk memeriksa format private key
  console.log('Private key starts with:', privateKey.substring(0, 50));
  console.log('Private key ends with:', privateKey.substring(privateKey.length - 50));

  // Validasi credentials
  if (!credentials.client_email || !credentials.private_key || !credentials.project_id) {
    throw new Error('Environment variables tidak lengkap. Pastikan GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, dan GOOGLE_PROJECT_ID sudah diatur.');
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
