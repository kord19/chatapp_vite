import { useState, useEffect } from 'react';
import './App.css';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
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
import { auth, app, storage } from '../firebase';
import { FaSun, FaMoon } from 'react-icons/fa';

const db = getFirestore(app);

function App() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [image, setImage] = useState(null);

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

  const handleImageChange = (event) => {
    setImage(event.target.files[0]);
  };

  const sendMessage = async () => {
    if (newMessage.trim() === '' && !image) return;

    let imageUrl = '';
    if (image) {
      const storageRef = storage.ref(`images/${image.name}`);
      await storageRef.put(image);
      imageUrl = await storageRef.getDownloadURL();
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
      console.log(error);
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
                    src={msg.data.photoURL}
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
        <button
          className='login-button'
          onClick={handleGoogleLogin}
        >
          Login with Google
        </button>
      )}
    </div>
  );
}

export default App;
