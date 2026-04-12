import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const CREDENTIALS_PATH = path.join(process.cwd(), '.gdrive-creds', 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), '.gdrive-creds', 'token.json');

async function loadSavedCredentialsIfExist() {
  try {
    const content = fs.readFileSync(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function saveCredentials(client) {
  const content = fs.readFileSync(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  fs.writeFileSync(TOKEN_PATH, payload);
}

async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    // Explicitly refresh the token to avoid "Login Required" errors on first request
    try {
      await client.getAccessToken();
      return client;
    } catch (err) {
      console.log('Failed to refresh saved token, re-authenticating...', err.message);
    }
  }
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`Credentials file not found at ${CREDENTIALS_PATH}. Please follow the instructions to set it up.`);
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

async function uploadFile(authClient, filePath, folderId) {
  const drive = google.drive({ version: 'v3', auth: authClient });
  const fileMetadata = {
    name: path.basename(filePath),
    parents: folderId ? [folderId] : [],
  };
  const media = {
    mimeType: 'text/plain', // SRT is essentially plain text
    body: fs.createReadStream(filePath),
  };
  try {
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });
    console.log('File ID:', file.data.id);
    return file.data.id;
  } catch (err) {
    console.error('Error uploading file:', err);
    throw err;
  }
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node scripts/upload_to_gdrive.js <file_path> [folder_id]');
  process.exit(1);
}

const filePath = args[0];
const folderId = args[1] || null;

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

authorize().then((auth) => uploadFile(auth, filePath, folderId))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
