import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { profilesService, uploadImageService } from './services'; // Assuming services are in a 'services.ts' file

interface ProfileData {
  // Define your profile data structure
  [key: string]: any;
}

interface UpdateProfileProps {
  profileId: string;
}

const UpdateProfile: React.FC<UpdateProfileProps> = ({ profileId }) => {
  const [profile, setProfile] = useState<ProfileData>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const profileData = await profilesService.get(profileId);
      setProfile(profileData);
    };
    fetchProfile();
  }, [profileId]);

  const updateAttribute = (attribute: string) => {
    const data = { [attribute]: profile[attribute] };
    if (Object.keys(data).length > 0) {
      axios.put('https://primus.grindr.com/2.0/profile', data);
    }
  };

  useEffect(() => {
    const upload = async () => {
      if (imageFile) {
        setUploading(true);
        try {
          await uploadImageService.uploadProfileImage(imageFile);
          alert("Image up for review by some Grindr™ monkey");
        } catch (error) {
          alert("Image upload failed");
        } finally {
          setUploading(falese);
        }
      }
    };
    upload();
  }, [imageFile]);

  return (
    <div>
      {/* Your Update Profile UI */}
    </div>
  );
};

export default UpdateProfile;
