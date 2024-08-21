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
  const [modalContent, setModalContent] = useState(null); // Adicionado para o modal
  const [modalVisible, setModalVisible] = useState(false); // Adicionado para o modal

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

  const handleFileClick = (url, type) => {
    setModalContent({ url, type });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalContent(null);
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
              type='text'
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder='Digite uma mensagem...'
            />
            <button className='send-button' onClick={sendMessage}>
              Enviar
            </button>
          </div>

          <div className='messages-container'>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.data.uid === user.uid ? 'message-sent' : 'message-received'}`}
              >
                {message.data.photoURL && (
                  <img
                    className='avatar'
                    src={message.data.photoURL}
                    alt='Avatar'
                  />
                )}
                <div className='message-content'>
                  <p className='message-username'>
                    {message.data.displayName}
                  </p>
                  <p>{message.data.text}</p>
                  {message.data.fileUrl && message.data.fileType.startsWith('image/') && (
                    <img
                      className='message-image'
                      src={message.data.fileUrl}
                      alt='Anexo'
                      onClick={() => handleFileClick(message.data.fileUrl, 'image')}
                    />
                  )}
                  {message.data.fileUrl && message.data.fileType.startsWith('video/') && (
                    <video
                      className='message-video'
                      src={message.data.fileUrl}
                      controls
                      onClick={() => handleFileClick(message.data.fileUrl, 'video')}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {modalVisible && (
            <div className='modal show' onClick={closeModal}>
              <div className='modal-overlay'></div>
              <div className='modal-content'>
                {modalContent && modalContent.type === 'image' && (
                  <img src={modalContent.url} alt='Zoomed' />
                )}
                {modalContent && modalContent.type === 'video' && (
                  <video src={modalContent.url} controls />
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className='auth-container'>
          <button onClick={handleGoogleLogin}>Login com Google</button>
          <input
            type='text'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='Email'
          />
          <input
            type='password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder='Senha'
          />
          <button onClick={handleEmailSignUp}>Criar Conta</button>
          <button onClick={handleEmailLogin}>Login</button>
          {error && <p>{error}</p>}
        </div>
      )}
    </div>
  );
}

export default App;
