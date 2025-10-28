import React, { useState, useEffect } from 'react';
import { Cloud, Upload, Download, Trash2, File, LogOut, LogIn } from 'lucide-react';
import { auth, storage, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc,
  orderBy 
} from 'firebase/firestore';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        loadUserFiles(currentUser.uid);
      } else {
        setFiles([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadUserFiles = async (userId) => {
    try {
      const q = query(
        collection(db, 'files'),
        where('userId', '==', userId),
        orderBy('uploadedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const userFiles = [];
      querySnapshot.forEach((document) => {
        userFiles.push({ id: document.id, ...document.data() });
      });
      setFiles(userFiles);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!user) {
      alert('Please login first!');
      setShowAuth(true);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const storageRef = ref(storage, 'users/' + user.uid + '/' + Date.now() + '_' + file.name);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          alert('Upload failed: ' + error.message);
          setUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          await addDoc(collection(db, 'files'), {
            name: file.name,
            size: file.size,
            url: downloadURL,
            storagePath: uploadTask.snapshot.ref.fullPath,
            userId: user.uid,
            uploadedAt: new Date()
          });

          await loadUserFiles(user.uid);
          
          setUploading(false);
          setUploadProgress(0);
          alert('File uploaded successfully!');
          e.target.value = '';
        }
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file: ' + error.message);
      setUploading(false);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      const storageRef = ref(storage, file.storagePath);
      await deleteObject(storageRef);
      await deleteDoc(doc(db, 'files', file.id));
      await loadUserFiles(user.uid);
      alert('File deleted successfully!');
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file: ' + error.message);
    }
  };

  const handleDownload = (file) => {
    window.open(file.url, '_blank');
  };

  const handleAuth = async () => {
    setAuthError('');
    
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        alert('Logged in successfully!');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('Account created successfully!');
      }
      setShowAuth(false);
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Auth error:', error);
      setAuthError(error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert('Logged out successfully!');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Cloud className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Cloud className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Cloud Backup System</h1>
                <p className="text-sm text-gray-500">Secure File Storage & Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">{user.email}</span>
                  <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <button onClick={() => setShowAuth(true)} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide">Total Files</p>
                <p className="text-3xl font-bold text-indigo-600 mt-2">{files.length}</p>
              </div>
              <File className="w-12 h-12 text-indigo-200" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide">Storage Used</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{formatFileSize(totalSize)}</p>
              </div>
              <Cloud className="w-12 h-12 text-green-200" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide">Storage Limit</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">5 GB</p>
              </div>
              <Cloud className="w-12 h-12 text-purple-200" />
            </div>
          </div>
        </div>

        {user ? (
          <>
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Files</h2>
              <div className="border-2 border-dashed border-indigo-300 rounded-lg p-8 text-center hover:border-indigo-500 transition">
                <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-16 h-16 text-indigo-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700">
                    {uploading ? 'Uploading ' + Math.round(uploadProgress) + '%' : 'Click to upload files'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">Upload your project and research files</p>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Your Files</h2>
              
              {files.length === 0 ? (
                <div className="text-center py-12">
                  <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No files uploaded yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 uppercase">File Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 uppercase">Size</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 uppercase">Uploaded</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file) => (
                        <tr key={file.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <File className="w-5 h-5 text-indigo-500" />
                              <span className="font-medium text-gray-800">{file.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600">{formatFileSize(file.size)}</td>
                          <td className="py-4 px-4 text-gray-600">{formatDate(file.uploadedAt)}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end space-x-2">
                              <button onClick={() => handleDownload(file)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Download">
                                <Download className="w-5 h-5" />
                              </button>
                              <button onClick={() => handleDelete(file)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Cloud className="w-24 h-24 text-indigo-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Cloud Backup System</h2>
            <p className="text-gray-600 mb-6">Please login or create an account to start uploading your files</p>
            <button onClick={() => setShowAuth(true)} className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium">
              Get Started
            </button>
          </div>
        )}
      </main>

      {showAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">{authMode === 'login' ? 'Login' : 'Sign Up'}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="your@email.com" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="••••••••" />
              </div>

              {authError && <p className="text-sm text-red-600">{authError}</p>}

              <button onClick={handleAuth} className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-medium">
                {authMode === 'login' ? 'Login' : 'Sign Up'}
              </button>
            </div>

            <div className="mt-4 text-center">
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }} className="text-sm text-indigo-600 hover:text-indigo-700">
                {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
              </button>
            </div>

            <button onClick={() => { setShowAuth(false); setAuthError(''); }} className="mt-4 w-full text-gray-600 hover:text-gray-800">
              Close
            </button>
          </div>
        </div>
      )}

      <footer className="bg-white mt-12 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">Cloud Backup System - College Project | Built with React & Firebase</p>
        </div>
      </footer>
    </div>
  );
}

export default App;