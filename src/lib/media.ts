import { createUploadId } from './ids';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1800;
const PUBLIC_MEDIA_BUCKET = 'trip-media';

export async function prepareImageUpload(file: File, maxDimension = MAX_IMAGE_DIMENSION): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Image must be 10MB or smaller.');

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The selected image could not be read.'));
    });

    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is unavailable in this browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    if (!blob) throw new Error('The selected image could not be processed.');
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'tripmates-image';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadImage(file: File, folder: 'avatars' | 'trip-covers' | 'community' = 'trip-covers'): Promise<string> {
  const { supabase } = await import('./supabase');
  if (!supabase) throw new Error('Supabase is not configured. Add the Supabase URL and anon key to the app environment.');
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('Sign in before uploading an image.');

  const prepared = await prepareImageUpload(file);
  const objectPath = `${authData.user.id}/${folder}/${createUploadId()}.jpg`;
  const { error: uploadError } = await supabase.storage.from(PUBLIC_MEDIA_BUCKET).upload(objectPath, prepared, {
    contentType: prepared.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) {
    if (uploadError.message.toLowerCase().includes('bucket not found')) {
      throw new Error('Supabase Storage is missing the trip-media bucket. Apply the updated supabase/schema.sql setup.');
    }
    throw new Error(uploadError.message || 'Image upload failed. Please try again.');
  }

  const { data } = supabase.storage.from(PUBLIC_MEDIA_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}
