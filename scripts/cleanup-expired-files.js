// scripts/cleanup-expired-files.js
require('dotenv').config();
console.log('Loaded environment variables.');
const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appwrite_project_id = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const appwrite_endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const appwrite_api_key = process.env.APPWRITE_API_KEY;
const appwrite_bucket = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_KEY;


if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables for Supabase');
  throw new Error('Missing required environment variables for Supabase');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
console.log('Supabase admin client created.');

async function cleanup() {
  console.log('Fetching all file metadata from Supabase...');
  const { data: files, error } = await supabaseAdmin
    .from('zip_file_metadata')
    .select('*');

  if (error) {
    console.error('Error fetching files:', error);
    return;
  }

  const now = new Date();
  console.log('Current time:', now.toISOString());

  for (const file of files) {
    if (!file.expiry_date) {
      console.log(`File ${file.id} has no expiry_date, skipping.`);
      continue;
    }
    const expiryDate = new Date(file.expiry_date);
    if (expiryDate > now) {
      // Not expired, skip
      console.log(`File ${file.id} not expired (expires at ${expiryDate.toISOString()}), skipping.`);
      continue;
    }
    
    try {
      console.log(`Attempting to delete expired file ${file.id} from Appwrite...`);
      
      // Step 1: Delete from Appwrite storage first
      const appwriteResponse = await fetch(
        `${appwrite_endpoint}/storage/buckets/${appwrite_bucket}/files/${file.appwrite_id}`,
        {
          method: 'DELETE',
          headers: {
            'X-Appwrite-Project': appwrite_project_id,
            'X-Appwrite-Key': appwrite_api_key,
          },
        }
      );

      if (!appwriteResponse.ok && appwriteResponse.status !== 404) {
        // 404 means the storage object is already gone — still clean up the
        // metadata, otherwise the row is retried and skipped forever
        const errorText = await appwriteResponse.text();
        console.error(`Failed to delete file ${file.id} from Appwrite. Status: ${appwriteResponse.status}, Error: ${errorText}`);
        continue; // Skip to next file, don't delete from Supabase
      }

      console.log(`Successfully deleted file ${file.id} from Appwrite.`);
      
      // Step 2: Only if Appwrite deletion succeeded, delete from Supabase
      console.log(`Deleting file ${file.id} metadata from Supabase...`);
      const { error: supabaseError } = await supabaseAdmin.from('zip_file_metadata').delete().eq('id', file.id);
      
      if (supabaseError) {
        console.error(`Failed to delete file ${file.id} metadata from Supabase:`, supabaseError);
        continue; // Skip audit log if Supabase deletion failed
      }
      
      console.log(`Successfully deleted file ${file.id} metadata from Supabase.`);
      
      // Step 3: Only if both deletions succeeded, insert audit log
      console.log(`Inserting audit log for file ${file.id}...`);
      const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
        action: 'file_deleted',
        resource_type: 'zip',
        resource_id: file.id,
        user_id: file.uploaded_by || null,
        metadata: {
          filename: file.original_name,
          reason: 'time limit expired',
        },
      });
      
      if (auditError) {
        console.error(`Failed to insert audit log for file ${file.id}:`, auditError);
      } else {
        console.log(`Successfully inserted audit log for file ${file.id}.`);
      }
      
    } catch (err) {
      console.error(`Error processing file ${file.id}:`, err);
    }
  }
  console.log('Cleanup script finished.');
}

cleanup().catch(err => {
  console.error('Cleanup script failed:', err);
  process.exitCode = 1;
});
