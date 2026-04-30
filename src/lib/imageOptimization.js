/**
 * imageOptimization.js
 * 
 * Provides pure HTML5 Client-Side Image Compression using Canvas.
 */

/**
 * Compresses an image file securely within the browser strictly to JPEG.
 * @param {File} file - The original image file
 * @param {Object} options - Compression options
 * @param {number} options.maxWidth - Maximum allowed width
 * @param {number} options.maxHeight - Maximum allowed height
 * @param {boolean} options.cropSquare - If true, exact center crop to match dimensions
 * @param {number} options.quality - JPEG quality (0 to 1)
 * @returns {Promise<Blob>} The resulting compressed JPEG blob
 */
export const compressImage = (file, { maxWidth, maxHeight, cropSquare = false, quality = 0.8 }) => {
  return new Promise((resolve, reject) => {
    // 1. Validate file type initially
    if (!file.type.match(/image.*/)) {
      return reject(new Error("File is not an image"));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        let offsetX = 0;
        let offsetY = 0;

        // Calculate dimensional scaling
        if (cropSquare) {
          // Profile mode strictly wants exact square
          const size = Math.min(width, height);
          offsetX = (width - size) / 2;
          offsetY = (height - size) / 2;
          width = size;
          height = size;
        } else {
          // Standard proportional scale down
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (cropSquare) {
          canvas.width = maxWidth;
          canvas.height = maxHeight;
          ctx.drawImage(img, offsetX, offsetY, width, height, 0, 0, maxWidth, maxHeight);
        } else {
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
        }

        // Export as JPEG
        canvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error("Canvas to Blob conversion failed"));
          }
          resolve(blob);
        }, "image/jpeg", quality); 
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Pipeline to Process and Upload Photo to Cloudinary
 * Evaluates against 300KB limit after compression.
 * 
 * @param {File} file - Image File
 * @param {string} type - 'profile' or 'achievement'
 * @returns {Promise<string>} The secure_url from Cloudinary
 */
export const processAndUploadImage = async (file, type) => {
  if (!file) throw new Error("No file provided");
  if (!file.type.includes('image/')) throw new Error("Please upload a valid image file");
  
  // 1. Process via Client-Side Canvas
  let blob;
  const config = {
    profile: { maxWidth: 400, maxHeight: 400, cropSquare: true },
    achievement: { maxWidth: 1200, maxHeight: 1200, cropSquare: false },
    opportunities: { maxWidth: 1200, maxHeight: 1200, cropSquare: false },
    cover: { maxWidth: 1600, maxHeight: 1600, cropSquare: false } // Slightly larger for covers
  };

  const settings = config[type];
  if (!settings) throw new Error(`Invalid optimization type: ${type}`);

  // Try initial compression at high quality (0.8)
  blob = await compressImage(file, { ...settings, quality: 0.8 });

  // 2. Adaptive Quality Fallback (ensure under 300KB)
  let fileSizeKB = blob.size / 1024;
  
  if (fileSizeKB > 300) {
    // Retry at 0.7 quality
    blob = await compressImage(file, { ...settings, quality: 0.7 });
    fileSizeKB = blob.size / 1024;
  }

  if (fileSizeKB > 300) {
    // Final try at 0.6 quality (still looks good for web)
    blob = await compressImage(file, { ...settings, quality: 0.6 });
    fileSizeKB = blob.size / 1024;
  }

  if (fileSizeKB > 300) {
    throw new Error(`Image is still too large (${Math.round(fileSizeKB)} KB) after max compression. Please use a smaller file.`);
  }

  // 3. Ensure Cloudinary Keys exist
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary configuration missing. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env");
  }

  // 4. Upload to Cloudinary Unsigned Endpoint
  const formData = new FormData();
  formData.append('file', blob, `optimized_${Date.now()}.jpg`);
  formData.append('upload_preset', uploadPreset);

  const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  
  const response = await fetch(cloudinaryUrl, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to upload image to Cloudinary");
  }

  return data.secure_url; // Return the hosted URL
};
