import { useState, useEffect } from 'react';

export default function Home() {
  const [user, setUser] = useState(null);
  const [searchData, setSearchData] = useState({
    from: '',
    to: '',
    date: '',
    passengers: 1
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState('');

  // Auth States
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    userType: 'both'
  });
  const [verifyData, setVerifyData] = useState({ email: '', code: '' });
  
  // Offer Ride States
  const [offerData, setOfferData] = useState({
    from: '',
    to: '',
    date: '',
    time: '',
    availableSeats: 3,
    price: '',
    description: ''
  });
  
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('ridyshidy_token');
    const userData = localStorage.getItem('ridyshidy_user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleSearch = async () => {
    if (!searchData.from || !searchData.to) {
      alert('Bitte Abfahrts- und Zielort eingeben');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/rides/search?from=${searchData.from}&to=${searchData.to}&date=${searchData.date}&passengers=${searchData.passengers}`);
      const data = await response.json();
      setResults(data.rides || []);
    } catch (error) {
      console.error('Search error:', error);
      alert('Fehler bei der Suche');
    }
    setLoading(false);
  };

  const handleOfferRide = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage('');

    try {
      const token = localStorage.getItem('ridyshidy_token');
      const response = await fetch('/api/rides/offer', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(offerData)
      });

      const data = await response.json();

      if (response.ok) {
        setAuthMessage('✅ Fahrt erfolgreich veröffentlicht!');
        setOfferData({
          from: '',
          to: '',
          date: '',
          time: '',
          availableSeats: 3,
          price: '',
          description: ''
        });
        setTimeout(() => {
          setShowModal('');
          setAuthMessage('');
          if (searchData.from && searchData.to) {
            handleSearch();
          }
        }, 2000);
      } else {
        setAuthMessage('❌ ' + data.error);
      }
    } catch (error) {
      setAuthMessage('❌ Netzwerkfehler. Bitte versuchen Sie es erneut.');
    }
    setAuthLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('ridyshidy_token', data.token);
        localStorage.setItem('ridyshidy_user', JSON.stringify(data.user));
        setUser(data.user);
        setShowModal('');
        setAuthMessage('');
        setLoginData({ email: '', password: '' });
      } else {
        setAuthMessage('❌ ' + data.error);
      }
    } catch (error) {
      setAuthMessage('❌ Netzwerkfehler. Bitte versuchen Sie es erneut.');
    }
    setAuthLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage('');

    if (registerData.password !== registerData.confirmPassword) {
      setAuthMessage('❌ Passwörter stimmen nicht überein');
      setAuthLoading(false);
      return;
    }

    if (registerData.password.length < 8) {
      setAuthMessage('❌ Passwort muss mindestens 8 Zeichen lang sein');
      setAuthLoading(false);
      return;
    }

    if (!registerData.phone || registerData.phone.length < 10) {
      setAuthMessage('❌ Bitte geben Sie eine gültige Telefonnummer ein');
      setAuthLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });

      const data = await response.json();

      if (response.ok) {
        setVerifyData({ email: registerData.email, code: '' });
        setShowModal('verify');
        setAuthMessage(`✅ Registrierung erfolgreich! Ihr Verifizierungscode: ${data.verificationCode}`);
      } else {
        setAuthMessage('❌ ' + data.error);
      }
    } catch (error) {
      setAuthMessage('❌ Netzwerkfehler. Bitte versuchen Sie es erneut.');
    }
    setAuthLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage('');

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyData)
      });

      const data = await response.json();

      if (response.ok) {
        setAuthMessage('✅ E-Mail erfolgreich verifiziert! Sie können sich jetzt anmelden.');
        setTimeout(() => {
          setShowModal('login');
          setLoginData({ email: verifyData.email, password: '' });
          setAuthMessage('');
        }, 2000);
      } else {
        setAuthMessage('❌ ' + data.error);
      }
    } catch (error) {
      setAuthMessage('❌ Netzwerkfehler. Bitte versuchen Sie es erneut.');
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('ridyshidy_token');
    localStorage.removeItem('ridyshidy_user');
    setUser(null);
    setResults([]);
  };

  const closeModal = () => {
    setShowModal('');
    setAuthMessage('');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ color: '#667eea', margin: 0 }}>🚗 RidyShidy</h1>
        <div>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ color: '#667eea', fontWeight: 'bold' }}>
                Hallo, {user.firstName}! 👋
              </span>
              <span style={{ 
                backgroundColor: user.userType === 'driver' ? '#28a745' : user.userType === 'both' ? '#007bff' : '#ffc107',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                {user.userType === 'driver' ? '🚗 Fahrer' : user.userType === 'both' ? '🚗👥 Fahrer & Mitfahrer' : '👥 Mitfahrer'}
              </span>
              {(user.userType === 'driver' || user.userType === 'both') && (
                <button 
                  onClick={() => setShowModal('offer')}
                  style={{ 
                    backgroundColor: '#28a745', 
                    color: 'white', 
                    border: 'none', 
                    padding: '8px 16px', 
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  ➕ Fahrt anbieten
                </button>
              )}
              <button 
                onClick={handleLogout}
                style={{ 
                  backgroundColor: '#dc3545', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Abmelden
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowModal('login')}
                style={{ 
                  backgroundColor: 'transparent', 
                  color: '#667eea', 
                  border: '2px solid #667eea', 
                  padding: '8px 16px', 
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Anmelden
              </button>
              <button 
                onClick={() => setShowModal('register')}
                style={{ 
                  backgroundColor: '#667eea', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 16px', 
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Registrieren
              </button>
            </div>
          )}
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
        Die beste Plattform für Mitfahrgelegenheiten 🌟
      </p>
      
      {/* Search Form */}
      <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '20px', border: '2px solid #667eea', borderRadius: '15px', backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2>🔍 Mitfahrt suchen</h2>
        
        <input 
          type="text" 
          placeholder="Von wo? (z.B. Berlin, München, Hamburg)"
          value={searchData.from}
          onChange={(e) => setSearchData({...searchData, from: e.target.value})}
          style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
        />
        
        <input 
          type="text" 
          placeholder="Wohin? (z.B. Hamburg, Frankfurt, Köln)"
          value={searchData.to}
          onChange={(e) => setSearchData({...searchData, to: e.target.value})}
          style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
        />
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="date" 
            value={searchData.date}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setSearchData({...searchData, date: e.target.value})}
            style={{ flex: 1, padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          <input 
            type="number" 
            placeholder="Personen"
            value={searchData.passengers}
            onChange={(e) => setSearchData({...searchData, passengers: e.target.value})}
            min="1" max="8"
            style={{ flex: 1, padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
          />
        </div>
        
        <button 
          onClick={handleSearch}
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '15px', 
            backgroundColor: loading ? '#ccc' : '#667eea', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            fontSize: '18px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '10px',
            fontWeight: 'bold'
          }}
        >
          {loading ? '⏳ Suche läuft...' : '🔍 Mitfahrt finden'}
        </button>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
          <h2>🚗 Gefundene Fahrten ({results.length})</h2>
          {results.map(ride => (
            <div key={ride.id} style={{ 
              border: '1px solid #ddd', 
              borderRadius: '10px', 
              padding: '20px', 
              margin: '10px 0',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: '#667eea', margin: 0 }}>
                  {ride.from} → {ride.to}
                </h3>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  {ride.price}€
                </div>
              </div>
              
              <div style={{ margin: '10px 0', color: '#666' }}>
                📅 {new Date(ride.date).toLocaleDateString('de-DE')} um {ride.time}<br/>
                👥 {ride.availableSeats} Plätze verfügbar<br/>
                👤 Fahrer: {ride.driver.name} ⭐ {ride.driver.rating}
              </div>
              
              {ride.description && (
                <div style={{ fontStyle: 'italic', color: '#555', marginTop: '10px', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '5px' }}>
                  💬 "{ride.description}"
                </div>
              )}
              
              <button 
                onClick={() => user ? alert('🎫 Buchung wird als nächstes implementiert!') : setShowModal('login')}
                style={{
                  backgroundColor: user ? '#28a745' : '#ffc107',
                  color: user ? 'white' : '#212529',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  marginTop: '15px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
              >
                {user ? '🎫 Jetzt buchen' : '🔐 Zum Buchen anmelden'}
              </button>
            </div>
          ))}
        </div>
      )}
      
      {results.length === 0 && searchData.from && searchData.to && !loading && (
        <div style={{ textAlign: 'center', margin: '2rem', color: '#666', backgroundColor: 'white', padding: '2rem', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>😔 Keine Fahrten gefunden</h3>
          <p>Probieren Sie andere Städte oder Daten aus.</p>
          <p><strong>Tipp:</strong> Versuchen Sie "Berlin" nach "Hamburg" oder "München" nach "Frankfurt"</p>
          {user && (user.userType === 'driver' || user.userType === 'both') && (
            <button 
              onClick={() => setShowModal('offer')}
              style={{ 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                padding: '12px 24px', 
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                marginTop: '15px',
                fontWeight: 'bold'
              }}
            >
              ➕ Erste Fahrt anbieten
            </button>
          )}
        </div>
      )}

      {/* Login Modal */}
      {showModal === 'login' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '15px', maxWidth: '400px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>🔐 Anmelden</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            
            {authMessage && (
              <div style={{ 
                padding: '10px', 
                borderRadius: '5px', 
                marginBottom: '15px',
                backgroundColor: authMessage.includes('✅') ? '#d4edda' : '#f8d7da',
                color: authMessage.includes('✅') ? '#155724' : '#721c24',
                border: `1px solid ${authMessage.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
              }}>
                {authMessage}
              </div>
            )}
            
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="E-Mail Adresse"
                value={loginData.email}
                onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                required
                style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
              />
              <input
                type="password"
                placeholder="Passwort"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                required
                style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
              />
              <button
                type="submit"
                disabled={authLoading}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  backgroundColor: authLoading ? '#ccc' : '#667eea', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontSize: '16px',
                  cursor: authLoading ? 'not-allowed' : 'pointer',
                  marginTop: '10px'
                }}
              >
                {authLoading ? 'Anmelden...' : '🔐 Anmelden'}
              </button>
            </form>
            
            <p style={{ textAlign: 'center', marginTop: '15px' }}>
              Noch kein Konto? {' '}
              <button 
                onClick={() => setShowModal('register')}
                style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Jetzt registrieren
              </button>
            </p>
            
            <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '5px', fontSize: '14px' }}>
              <strong>Demo-Account:</strong><br/>
              📧 test@ridyshidy.com<br/>
              🔑 Test123!
            </div>
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showModal === 'register' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '15px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>📝 Registrieren</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            
            {authMessage && (
              <div style={{ 
                padding: '10px', 
                borderRadius: '5px', 
                marginBottom: '15px',
                backgroundColor: authMessage.includes('✅') ? '#d4edda' : '#f8d7da',
                color: authMessage.includes('✅') ? '#155724' : '#721c24',
                border: `1px solid ${authMessage.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
              }}>
                {authMessage}
              </div>
            )}
            
            <form onSubmit={handleRegister}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Vorname"
                  value={registerData.firstName}
                  onChange={(e) => setRegisterData({...registerData, firstName: e.target.value})}
                  required
                  style={{ flex: 1, padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
                />
                <input
                  type="text"
                  placeholder="Nachname"
                  value={registerData.lastName}
                  onChange={(e) => setRegisterData({...registerData, lastName: e.target.value})}
                  required
                  style={{ flex: 1, padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
                />
              </div>
              
              <input
                type="email"
                placeholder="E-Mail Adresse"
                value={registerData.email}
                onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                required
                style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
              />
              
              <input
                type="tel"
                placeholder="📞 Telefonnummer (z.B. +49 123 456 789)"
                value={registerData.phone}
                onChange={(e) => setRegisterData({...registerData, phone: e.target.value})}
                required
                style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
              />
              
              <select
                value={registerData.userType}
                onChange={(e) => setRegisterData({...registerData, userType: e.target.value})}
                required
                style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
              >
                <option value="passenger">🚗 Nur Mitfahrer</option>
                <option value="driver">👨‍✈️ Nur Fahrer</option>
                <option value="both">🚗👨‍✈️ Fahrer und Mitfahrer (Empfohlen)</option>
              </select>
              
              <input
                type="password"
                placeholder="🔒 Passwort (mindestens 8 Zeichen)"
                value={registerData.password}
                onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                required
                minLength="8"
                style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
              />
              
              <input
                type="password"
                placeholder="🔒 Passwort bestätigen"
                value={registerData.confirmPassword}
                onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                required
                minLength="8"
                style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
              />
              
              <button
                type="submit"
                disabled={authLoading}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  backgroundColor: authLoading ? '#ccc' : '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  fontSize: '16px',
                  cursor: authLoading ? 'not-allowed' : 'pointer',
                  marginTop: '10px'
                }}
              >
                {authLoading ? 'Registrieren...' : '📝 Kostenlos registrieren'}
              </button>
            </form>
            
            <p style={{ textAlign: 'center', marginTop: '15px' }}>
              Bereits registriert? {' '}
              <button 
                onClick={() => setShowModal('login')}
                style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Jetzt anmelden
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showModal === 'verify' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '15px', maxWidth: '400px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>✉️ E-Mail verifizieren</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Wir haben einen 6-stelligen Code an <strong>{verifyData.email}</strong> gesendet.
            </p>
            
            {authMessage && (
              <div style={{ 
                padding: '10px', 
                borderRadius: '5px', 
                marginBottom: '15px',
                backgroundColor: authMessage.includes('✅') ? '#d4edda' : '#f8d7da',
                color: authMessage.includes('✅') ? '#155724' : '#721c24',
                border: `1px solid ${authMessage.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
              }}>
                {authMessage}
              </div>
            )}
            
            <form onSubmit={handleVerify}>
              <input
                type="text"
                placeholder="6-stelliger Code"
                value={verifyData.code}
                onChange={(e) => setVerifyData({...verifyData, code: e.target.value.replace(/\D/g, '').substring(0, 6)})}
                required
                maxLength="6"
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  margin: '8px 0', 
                  borderRadius: '8px', 
                  border: '1px solid #ccc', 
                  fontSize: '18px',
                  textAlign: 'center',
                  letterSpacing: '0.2em',
                  fontWeight: 'bold'
                }}
              />
              <button
                type="submit"
                disabled={authLoading || verifyData.code.length !== 6}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  backgroundColor: (authLoading || verifyData.code.length !== 6) ? '#ccc' : '#28a745', 
                  color: 'white', 
                  border: 'none', 
		  borderRadius: '8px',
                 fontSize: '16px',
                 cursor: (authLoading || verifyData.code.length !== 6) ? 'not-allowed' : 'pointer',
                 marginTop: '10px'
               }}
             >
               {authLoading ? 'Verifizieren...' : '✅ E-Mail verifizieren'}
             </button>
           </form>
         </div>
       </div>
     )}

     {/* Offer Ride Modal */}
     {showModal === 'offer' && (
       <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
         <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '15px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
             <h2>🚗 Fahrt anbieten</h2>
             <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
           </div>

           {authMessage && (
             <div style={{
               padding: '10px',
               borderRadius: '5px',
               marginBottom: '15px',
               backgroundColor: authMessage.includes('✅') ? '#d4edda' : '#f8d7da',
               color: authMessage.includes('✅') ? '#155724' : '#721c24',
               border: `1px solid ${authMessage.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
             }}>
               {authMessage}
             </div>
           )}

           <form onSubmit={handleOfferRide}>
             <input
               type="text"
               placeholder="🗺️ Von wo? (z.B. Berlin)"
               value={offerData.from}
               onChange={(e) => setOfferData({...offerData, from: e.target.value})}
               required
               style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
             />

             <input
               type="text"
               placeholder="🎯 Wohin? (z.B. Hamburg)"
               value={offerData.to}
               onChange={(e) => setOfferData({...offerData, to: e.target.value})}
               required
               style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
             />

             <div style={{ display: 'flex', gap: '10px' }}>
               <input
                 type="date"
                 value={offerData.date}
                 min={new Date().toISOString().split('T')[0]}
                 onChange={(e) => setOfferData({...offerData, date: e.target.value})}
                 required
                 style={{ flex: 1, padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
               />
               <input
                 type="time"
                 value={offerData.time}
                 onChange={(e) => setOfferData({...offerData, time: e.target.value})}
                 required
                 style={{ flex: 1, padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
               />
             </div>

             <div style={{ display: 'flex', gap: '10px' }}>
               <select
                 value={offerData.availableSeats}
                 onChange={(e) => setOfferData({...offerData, availableSeats: e.target.value})}
                 required
                 style={{ flex: 1, padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
               >
                 <option value="">👥 Plätze wählen</option>
                 <option value="1">1 Platz</option>
                 <option value="2">2 Plätze</option>
                 <option value="3">3 Plätze</option>
                 <option value="4">4 Plätze</option>
                 <option value="5">5 Plätze</option>
               </select>

               <input
                 type="number"
                 placeholder="💰 Preis/Person"
                 value={offerData.price}
                 onChange={(e) => setOfferData({...offerData, price: e.target.value})}
                 required
                 min="1"
                 max="200"
                 style={{ flex: 1, padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px' }}
               />
             </div>

             <textarea
               placeholder="💬 Beschreibung (optional)
z.B. 'Entspannte Fahrt mit Musik', 'Nichtraucher', 'Zwischenstopp möglich'"
               value={offerData.description}
               onChange={(e) => setOfferData({...offerData, description: e.target.value})}
               rows="3"
               style={{ width: '100%', padding: '12px', margin: '8px 0', borderRadius: '8px', border: '1px solid #ccc', fontSize: '16px', resize: 'vertical' }}
             />

             <button
               type="submit"
               disabled={authLoading}
               style={{
                 width: '100%',
                 padding: '15px',
                 backgroundColor: authLoading ? '#ccc' : '#28a745',
                 color: 'white',
                 border: 'none',
                 borderRadius: '8px',
                 fontSize: '18px',
                 cursor: authLoading ? 'not-allowed' : 'pointer',
                 marginTop: '15px',
                 fontWeight: 'bold'
               }}
             >
               {authLoading ? 'Veröffentlichen...' : '🚗 Fahrt veröffentlichen'}
             </button>
           </form>

           <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '8px', fontSize: '14px' }}>
             <strong>💡 Tipp:</strong> Faire Preise und gute Beschreibungen führen zu mehr Buchungen!
           </div>
         </div>
       </div>
     )}
   </div>
 );
}
