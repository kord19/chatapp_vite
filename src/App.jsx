import { useState, useEffect } from 'react';
import './App.css';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import {
  getFirestore,
  onSnapshot,
  collection,
  addDoc,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, app } from '../firebase';
import { FaSun, FaMoon } from 'react-icons/fa';

const db = getFirestore(app);
const storage = getStorage(app);

function App() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [image, setImage] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('timestamp'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          data: doc.data(),
        }))
      );
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const handleImageChange = (event) => {
    setImage(event.target.files[0]);
  };

  const handleAvatarChange = async (event) => {
    const avatarFile = event.target.files[0];
    if (avatarFile) {
      const userId = user.uid; 
      const storageRef = ref(storage, `avatars/${userId}/${avatarFile.name}`);
  
      try {
        await uploadBytes(storageRef, avatarFile);
        const avatarUrl = await getDownloadURL(storageRef);
        await updateProfile(user, {
          photoURL: avatarUrl,
        });
        setUser({ ...user, photoURL: avatarUrl });
        console.log('Avatar atualizado com sucesso:', avatarUrl);
      } catch (error) {
        console.error('Erro ao atualizar avatar:', error);
      }
    }
  };

  const sendMessage = async () => {
    if (newMessage.trim() === '' && !image) return;

    let imageUrl = '';
    if (image) {
      const storageRef = ref(storage, `images/${image.name}`);
      try {
        await uploadBytes(storageRef, image);
        imageUrl = await getDownloadURL(storageRef);
      } catch (error) {
        console.error('Erro ao fazer upload da imagem:', error);
      }
    }

    await addDoc(collection(db, 'messages'), {
      uid: user.uid,
      photoURL: user.photoURL,
      displayName: user.displayName,
      text: newMessage,
      imageUrl: imageUrl,
      timestamp: serverTimestamp(),
    });

    setNewMessage('');
    setImage(null);
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEmailSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (avatar) {
        const avatarRef = ref(storage, `avatars/${user.uid}/${avatar.name}`);
        await uploadBytes(avatarRef, avatar);
        const avatarUrl = await getDownloadURL(avatarRef);
        await updateProfile(user, {
          photoURL: avatarUrl,
        });
      }

      setUser(user);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEmailLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setError(error.message);
    }
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`app-container ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <button className="theme-toggle-button" onClick={toggleTheme}>
        {darkMode ? <FaSun /> : <FaMoon />}
      </button>
      {user ? (
        <div className='chat-container'>
          <div className='user-info'>
            <img src={user.photoURL || 'default-avatar-url'} alt="User Avatar" className="user-avatar" />
            Logged in as {user.displayName}
          </div>
          <div className='message-input-container'>
            <input
              type='file'
              className='file-input'
              onChange={handleImageChange}
            />
            <input
              className='message-input'
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder='Enter your message...'
            />
            <button
              className='send-button'
              onClick={sendMessage}
            >
              Send
            </button>
          </div>
          <button
            className='logout-button'
            onClick={() => auth.signOut()}
          >
            Logout
          </button>
          <div className='messages-container'>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message-wrapper ${
                  msg.data.uid === user.uid ? 'message-sent' : 'message-received'
                }`}
              >
                <div className='message'>
                  <img
                    className='avatar'
                    src={msg.data.photoURL || 'default-avatar-url'}
                    alt='User Avatar'
                  />
                  <div className='message-content'>
                    <span className='message-username'>{msg.data.displayName}</span>
                    <p className='message-text'>{msg.data.text}</p>
                    {msg.data.imageUrl && (
                      <img
                        className='message-image'
                        src={msg.data.imageUrl}
                        alt='Sent'
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="login-container">
          <button className='login-button' onClick={handleGoogleLogin}>
            Login with Google
          </button>
          <div className="email-login-container">
            <input
              type="email"
              className="email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <input
              type="password"
              className="password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            <input
              type="file"
              className="avatar-input"
              onChange={handleAvatarChange}
            />
            <button className='login-button' onClick={handleEmailLogin}>
              Login with Email
            </button>
            <button className='signup-button' onClick={handleEmailSignUp}>
              Sign Up with Email
            </button>
            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
