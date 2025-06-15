const cloudinary = require('cloudinary').v2;

exports.uploadMediaToCloudinary = async (file, folder) => {
  try {
    const options = {
      folder,
      resource_type: 'auto',
    };
    return await cloudinary.uploader.upload(file.tempFilePath, options);
  } catch (error) {
    console.error("Error uploading media:", error);
    throw error;
  }
};

exports.uploadRawFileToCloudinary = async (file, folder) => {
  try {
    const originalName = file.name; 
    const extension = originalName.substring(originalName.lastIndexOf('.') + 1);
    const publicId = originalName.replace(`.${extension}`, '');

    const options = {
      folder,
      resource_type: 'raw',
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      public_id: publicId,
    };

    const uploadResult = await cloudinary.uploader.upload(file.tempFilePath, options);

    return {
      url: uploadResult.secure_url,
      filename: originalName,
    };
  } catch (error) {
    console.error("Error uploading raw file:", error);
    throw error;
  }
};



// Function to delete a resource by public ID
exports.deleteResourceFromCloudinary = async (url) => {
    if (!url) return;

    try {
        const result = await cloudinary.uploader.destroy(url);
        console.log(`Deleted resource with public ID: ${url}`);
        console.log('Delete Resourse result = ', result)
        return result;
    } catch (error) {
        console.error(`Error deleting resource with public ID ${url}:`, error);
        throw error;
    }
};