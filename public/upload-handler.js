// public/upload-handler.js
// Small helper for other pages to upload files to Supabase Storage
import { supabase } from '/public/supabase-client.js';

export async function uploadToBucket(file, bucket='reviews'){
  if (!file) throw new Error('no file');
  const name = `${Date.now()}-${Math.random().toString(36).slice(2,6)}-${file.name.replace(/\s+/g,'_')}`;
  const { data, error } = await supabase.storage.from(bucket).upload(name, file);
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}
