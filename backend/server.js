const express = require('express');
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
  // Gunakan JSON credentials langsung
  const credentials = {
    "type": "service_account",
    "project_id": "webhookbackuo",
    "private_key_id": "b126cef6993649f1c611e44828988c79bd369550",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC3uhiH6AAKlR77\nffKisJmxffoSLaAOjFPaU2N4dQ+KhBAPqZWkCL7rD5apVvS0ETe6nfMDxPA/ULXO\nPfdiw/7cPWVqrbS8FkIxCSBddTKcpB3gt5pfZRGWE7gJxZPM6HfrSXn5Rgua3OiC\nksnRzEhIZYd6A/qnGsa514jgmJPWM0J/dJQE6GqLi+KVFFYdmyEM0wix3ux2CKim\niR92+gfmdYt++2dEvXDaAXWtnUketpuQRrZshxgOchK5t9PBcEeKemdhdquo2HJr\n+C8JfsPob6MVSAlGSOc8Y8O4bl2Wdb0JqW5pu8s290O1vl4itS7Fu+RfUl5Bo2uF\ncP33HQkXAgMBAAECggEAKpVxlh6J0+oYUkYw9NBl7yO50HjOvlB8JwBo78SCI6LU\nbizqSCjWx3jHfNxwv0O2XQS7DMaawLIeUX0/V58B9V4toXo9h9LI6MCqxb6iSngn\njKxBlZbBar2LTIiE51uCYACZytMXYX+OTKVlLcFhh5YwvnEpqY2lPfHdAeGbcmvu\nZwgO4eJtwQ5jB4MIPU5e6vkccf4eQ5qui5DNk/sTvkYpWvIA9aFwi0kRblEh/Tn7\nxeEihXf1uNh7VjhmDQbNnD9InxnbMFIekRHsrQwfjGqlO3KpNJ15mY0hFYWa91yy\nns8SWcMy7loqyygmY8fE7mtqFOAiKH6JYAuW23cgEQKBgQDmhnkV4weEW5lQu2JL\ntqkmkSzfwY2vVei09nYWe2OAFxJOYN9XiggYG656JRakyEnZggqshHASPbAXJgpR\n9RSV12+SA23Bwk/zwogZ/cbC+JW18zHrmWtlHkG/NRu2g6yneG9ySGhCJbgvLSmT\nR8fIUmI5vsze7/ZyetyonaweLQKBgQDMB7ROZ7IwLnZK97FwJ/ANrElxhhC4bZmP\n4QbqS/d5h4+aQ27ycdQVfKuviSgoZKY+iRzagVhCGkSXhkRfSulIr7C4vn6T6Zy0\nIkRV6ghZghmahGjjRjfFNbcOeqYRVVPajkP55DlmumZ2sqoi3R2WnSPuGjKpz+2X\nFKzSnkUS0wKBgBl1pI3cQwpFK4uVBmgiRlAyHGih8cn5jPffeG9HNVgCNE1fuYrr\nfbVb6UsoKXYNgMp66D7haZc6JOaJlv4yORHLd1EC++44Tag4RdvJAVirJ62urEa+\n7POAAfbiIKtpo3njfTt777fOfqcHL95KQTBImPyTrAC7M9a05wXgVBAJAoGALPuR\n3CtulMLZn8OmYjTb7xfKBXZqX08CqT8SmDtxb2Dc30T4xAkmmionbAcQTH+MS4NN\nUjtsKv7Bmqqmjl/kuPrLOp/9Jj0+KFTZvhtgBePyIygIO/tyNk+WcWHHFVE7sJbn\nE8Qmh6iXCJpxekhHyroQfuFVxCyslD+hrrnoPrMCgYEA4T5rSjq9pEOZxMfhWSXZ\nqrLaOUbqevf2/a0fh/bsn6i5BD+q2Xei+P4xn2i4axf1dZLpAikANp6s/iUu9LWD\n+uow08zVYItD+ub6U55kv1vfR5kzjVNIWXMSsnGRGNsG95rKI0obQ80yi9XKcBCy\nuMEtL0atx5KRfu6Wr/IuhWA=\n-----END PRIVATE KEY-----\n",
    "client_email": "serayastore@webhookbackuo.iam.gserviceaccount.com",
    "client_id": "116761857650894053624",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/serayastore%40webhookbackuo.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
  };

  auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });

  drive = google.drive({ version: 'v3', auth });
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
