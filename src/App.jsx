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
  const [file, setFile] = useState(null); // Alterado para suportar imagens e vídeos
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
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
    });
  }, []);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleAvatarChange = async (event) => {
    const avatarFile = event.target.files[0];
    if (avatarFile) {
      const userId = user.uid;
      const storageRef = ref(storage, `avatars/${userId}/${avatarFile.name}`);

      try {
        await uploadBytes(storageRef, avatarFile);
        const avatarUrl = await getDownloadURL(storageRef);
        await updateProfile(user, { photoURL: avatarUrl });
        setUser({ ...user, photoURL: avatarUrl });
        console.log('Avatar atualizado com sucesso:', avatarUrl);
      } catch (error) {
        console.error('Erro ao atualizar avatar:', error);
      }
    }
  };

  const sendMessage = async () => {
    if (newMessage.trim() === '' && !file) return;
  
    let fileUrl = '';
    if (file) {
      const storageRef = ref(storage, `files/${file.name}`);
      await uploadBytes(storageRef, file);
      fileUrl = await getDownloadURL(storageRef);
    }
  
    await addDoc(collection(db, 'messages'), {
      uid: user.uid,
      photoURL: user.photoURL,
      displayName: user.displayName,
      text: newMessage,
      fileUrl: fileUrl,
      fileType: file ? file.type : '', // Adiciona o tipo de arquivo
      timestamp: serverTimestamp(),
    });
  
    setNewMessage('');
    setFile(null);
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.log(error);
    }
  };

  const handleEmailSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      let avatarUrl = '';
      if (avatar) {
        const avatarRef = ref(storage, `avatars/${user.uid}/${avatar.name}`);
        await uploadBytes(avatarRef, avatar);
        avatarUrl = await getDownloadURL(avatarRef);
      }

      await updateProfile(user, { photoURL: avatarUrl });
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
    <div className={`app-container ${user ? 'logged-in' : 'logged-out'} ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <button className="theme-toggle-button" onClick={toggleTheme}>
        {darkMode ? <FaSun /> : <FaMoon />}
      </button>
      {user ? (
        <div className='chat-container'>
          <div className='user-info'>
            Logged in as {user.displayName}
          </div>

          <div className='message-input-container'>
            <label htmlFor='file-input' className='file-input-label'>
              <i className="fas fa-file"></i> {/* Ícone opcional */}
              Escolher Arquivo
            </label>
            <input
              type='file'
              id='file-input'
              className='file-input'
              onChange={handleFileChange}
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
              Enviar
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
                    src={msg.data.photoURL}
                    alt='User Avatar'
                  />
                  <div className='message-content'>
                    <span className='message-username'>{msg.data.displayName}</span>
                    <p className='message-text'>{msg.data.text}</p>
                    {msg.data.fileUrl && (
                      msg.data.fileType.startsWith('image/') ? (
                        <img
                          className='message-file'
                          src={msg.data.fileUrl}
                          alt='Sent'
                        />
                      ) : msg.data.fileType.startsWith('video/') ? (
                        <video
                          className='message-file'
                          controls
                        >
                          <source src={msg.data.fileUrl} type={msg.data.fileType} />
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <a
                          className='message-file'
                          href={msg.data.fileUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                        >
                          Download Arquivo
                        </a>
                      )
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
              onChange={(e) => setAvatar(e.target.files[0])}
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
