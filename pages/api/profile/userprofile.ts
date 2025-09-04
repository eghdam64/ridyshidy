// components/Profile/UserProfile.tsx
// Haupt-Profil Komponente (ohne Hintergrund für Performance)

import React, { useState, useEffect } from 'react';
import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import ProfileContent from './ProfileContent';

interface UserProfileProps {
  userId?: string;
  initialData?: any;
}

const UserProfile: React.FC<UserProfileProps> = ({ userId, initialData }) => {
  const [userData, setUserData] = useState(initialData || null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (!initialData && userId) {
      fetchUserProfile();
    }
  }, [userId, initialData]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const result = await response.json();
      
      if (result.success) {
        setUserData(result.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updateData: any) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(updateData)
      });
      
      const result = await response.json();
      if (result.success) {
        setUserData(result.data);
        setIsEditing(false);
        return { success: true };
      }
      return { success: false, error: result.message };
    } catch (error) {
      return { success: false, error: 'Update failed' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Profil wird geladen...</span>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Profil nicht gefunden</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <ProfileHeader
        userData={userData}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        onUpdate={handleUpdateProfile}
      />
      
      <ProfileTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      
      <ProfileContent
        activeTab={activeTab}
        userData={userData}
        onUpdate={handleUpdateProfile}
      />
    </div>
  );
};

export default UserProfile;

// ===============================================
// components/Profile/ProfileHeader.tsx
// Header-Komponente ohne Hintergrund-Gradient

import React, { useState } from 'react';
import { 
  User, 
  Camera, 
  Edit3, 
  Save, 
  X, 
  CheckCircle,
  Shield,
  Star,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';

interface ProfileHeaderProps {
  userData: any;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  onUpdate: (data: any) => Promise<{ success: boolean; error?: string }>;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  userData,
  isEditing,
  setIsEditing,
  onUpdate
}) => {
  const [editData, setEditData] = useState({ ...userData });

  const handleSave = async () => {
    const result = await onUpdate(editData);
    if (result.success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditData({ ...userData });
    setIsEditing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="border rounded-lg mb-6 overflow-hidden">
      {/* Header ohne Gradient - nur weiß */}
      <div className="bg-white px-6 py-8 border-b">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-200">
              {userData.avatar ? (
                <img 
                  src={userData.avatar} 
                  alt="Profil" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <button className="absolute -bottom-1 -right-1 bg-blue-500 p-2 rounded-full shadow-md hover:bg-blue-600 transition-colors text-white">
              <Camera className="w-4 h-4" />
            </button>
            {userData.isVerified && (
              <div className="absolute -top-1 -right-1 bg-green-500 p-1 rounded-full">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between">
              <div>
                {isEditing ? (
                  <div className="space-y-3 mb-4">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={editData.firstName}
                        onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="border rounded px-3 py-1 text-lg font-semibold"
                        placeholder="Vorname"
                      />
                      <input
                        type="text"
                        value={editData.lastName}
                        onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="border rounded px-3 py-1 text-lg font-semibold"
                        placeholder="Nachname"
                      />
                    </div>
                    <input
                      type="text"
                      value={editData.alias}
                      onChange={(e) => setEditData(prev => ({ ...prev, alias: e.target.value }))}
                      className="border rounded px-3 py-1 text-sm"
                      placeholder="@alias"
                    />
                    <textarea
                      value={editData.bio}
                      onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                      className="border rounded px-3 py-1 text-sm w-full"
                      rows={2}
                      placeholder="Bio"
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      {userData.firstName} {userData.lastName}
                    </h2>
                    <p className="text-blue-600 text-sm mb-1">@{userData.alias}</p>
                    <div className="flex items-center space-x-3 mb-3">
                      {userData.isVerified && (
                        <div className="flex items-center space-x-1">
                          <Shield className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-600">Verifiziert</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm text-gray-600">
                          {userData.rating?.toFixed(1) || '0'} ({userData.totalReviews || 0} Bewertungen)
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm">{userData.bio}</p>
                  </>
                )}
              </div>

              {/* Stats - Kompakt */}
              <div className="mt-4 md:mt-0 flex md:flex-col space-x-6 md:space-x-0 md:space-y-2 text-center md:text-right">
                <div>
                  <div className="text-xl font-bold text-gray-900">{userData.totalRides || 0}</div>
                  <div className="text-xs text-gray-500">Fahrten</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(userData.totalEarned || 0)}
                  </div>
                  <div className="text-xs text-gray-500">Verdient</div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Button */}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Bearbeiten</span>
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Speichern</span>
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Abbrechen</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact Info - Minimalistisch */}
      <div className="bg-gray-50 px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">{userData.email}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">{userData.phone}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">{userData.location}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;

// ===============================================
// pages/profile.tsx oder pages/profile/index.tsx
// Seite für die Integration

import { GetServerSideProps } from 'next';
import Head from 'next/head';
import UserProfile from '../components/Profile/UserProfile';

interface ProfilePageProps {
  user?: any;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user }) => {
  return (
    <>
      <Head>
        <title>Mein Profil - RidyShidy</title>
        <meta name="description" content="Verwalten Sie Ihr RidyShidy Profil" />
      </Head>
      
      {/* Layout ohne Hintergrundfarbe */}
      <div className="min-h-screen">
        <UserProfile initialData={user} />
      </div>
    </>
  );
};

export default ProfilePage;

// Server-side Props für bessere Performance
export const getServerSideProps: GetServerSideProps = async (context) => {
  // Hier können Sie die Daten serverseitig laden
  try {
    // const user = await fetchUserProfile(context);
    return {
      props: {
        // user
      }
    };
  } catch (error) {
    return {
      props: {}
    };
  }
};

// ===============================================
// Integration in bestehende index.ts

// Fügen Sie dies zu Ihrer bestehenden index.ts hinzu:

// pages/index.ts (Erweitern Sie Ihre bestehende Datei)

import UserProfile from '../components/Profile/UserProfile';

// In Ihrer bestehenden Component:
export default function HomePage() {
  const [showProfile, setShowProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Profil anzeigen Handler
  const handleShowProfile = () => {
    setShowProfile(true);
  };

  return (
    <div>
      {/* Ihre bestehende Homepage */}
      {!showProfile ? (
        <>
          {/* Ihr bestehender Homepage Content */}
          <button 
            onClick={handleShowProfile}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Mein Profil
          </button>
        </>
      ) : (
        <>
          {/* Zurück Button */}
          <button 
            onClick={() => setShowProfile(false)}
            className="mb-4 text-blue-600 hover:text-blue-800"
          >
            ← Zurück zur Startseite
          </button>
          
          {/* Profil Komponente */}
          <UserProfile initialData={currentUser} />
        </>
      )}
    </div>
  );
}

// ===============================================
// Routing Integration (falls Sie Next.js Router verwenden)

// In Ihrer bestehenden Navigation:
import { useRouter } from 'next/router';

const Navigation = () => {
  const router = useRouter();
  
  return (
    <nav>
      {/* Ihre bestehende Navigation */}
      <button onClick={() => router.push('/profile')}>
        Mein Profil
      </button>
    </nav>
  );
};
