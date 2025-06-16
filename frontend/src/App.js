import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import 'leaflet-defaulticon-compatibility';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

function AddMarker({ onAdd }) {
  useMapEvents({
    click: (e) => {
      const name = prompt('Enter toilet name:');
      const description = prompt('Enter description (optional):');
      if (name) {
        onAdd({ name, description, lat: e.latlng.lat, lng: e.latlng.lng });
      }
    }
  });
  return null;
}

function App() {
  const [toilets, setToilets] = useState([]);
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState([20.5937, 78.9629]);
  const [mapKey, setMapKey] = useState('default');

  useEffect(() => {
    axios.get('http://localhost:5000/api/toilets')
      .then(res => setToilets(res.data));

    socket.on('ratingUpdated', updatedToilet => {
      setToilets(prev =>
        prev.map(t => (t.id === updatedToilet.id ? updatedToilet : t))
      );
    });

    return () => socket.off('ratingUpdated');
  }, []);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(pos => {
      const coords = [pos.coords.latitude, pos.coords.longitude];
      setUserLocation(coords);
      setMapKey(coords.toString());
    });
  }, []);

  const addToilet = async (toilet) => {
    const res = await axios.post('http://localhost:5000/api/toilets', toilet);
    setToilets([...toilets, res.data]);
  };

  const deleteToilet = async (id) => {
    await axios.delete(`http://localhost:5000/api/toilets/${id}`);
    setToilets(toilets.filter(t => t.id !== id));
  };

  const rateToilet = async (id, rating) => {
    const res = await axios.post(`http://localhost:5000/api/toilets/${id}/rate`, { rating });
    setToilets(toilets.map(t => (t.id === id ? res.data : t)));
  };

  const addComment = async (id) => {
    const comment = prompt('Your comment:');
    if (comment) {
      const res = await axios.post(`http://localhost:5000/api/toilets/${id}/comment`, { comment });
      setToilets(toilets.map(t => (t.id === id ? res.data : t)));
    }
  };

  const reportIssue = async (id) => {
    const issue = prompt('Describe the issue (e.g., dirty, closed):');
    if (issue) {
      const res = await axios.post(`http://localhost:5000/api/toilets/${id}/report`, { issue });
      setToilets(toilets.map(t => (t.id === id ? res.data : t)));
    }
  };

  const voteAccuracy = async (id) => {
    const res = await axios.post(`http://localhost:5000/api/toilets/${id}/vote`);
    setToilets(toilets.map(t => (t.id === id ? res.data : t)));
  };

  return (
    <div>
      <h1 style={{ textAlign: 'center' }}>🚻 Toilet Finder</h1>

      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Search by name or description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '8px', width: '60%' }}
        />
      </div>

      <MapContainer key={mapKey} center={userLocation} zoom={13} style={{ height: '80vh' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <AddMarker onAdd={addToilet} />

        <Marker position={userLocation}>
          <Popup>You are here</Popup>
        </Marker>

        {toilets
          .filter(t =>
            t.name?.toLowerCase().includes(search.toLowerCase()) ||
            t.description?.toLowerCase().includes(search.toLowerCase()))
          .map(toilet => (
            <Marker key={toilet.id} position={[toilet.lat, toilet.lng]}>
              <Popup>
                <b>{toilet.name}</b><br />
                {toilet.description}<br />
                ⭐ Rating: {toilet.ratings?.[0] || 'Not rated'}<br />
                <div>
                  {[1, 2, 3, 4, 5].map(num => (
                    <button key={num} onClick={() => rateToilet(toilet.id, num)}>⭐{num}</button>
                  ))}
                </div>
                <button onClick={() => addComment(toilet.id)}>💬 Comment</button>
                <button onClick={() => reportIssue(toilet.id)}>🚩 Report</button>
                <button onClick={() => voteAccuracy(toilet.id)}>👍 Vote</button><br />
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${toilet.lat},${toilet.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🧭 Navigate
                </a><br />
                <button onClick={() => deleteToilet(toilet.id)}>❌ Delete</button>
                <br />
                <b>Comments:</b>
                <ul>
                  {toilet.comments?.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
                <b>Reports:</b>
                <ul>
                  {toilet.reports?.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
                <b>Votes: {toilet.votes}</b>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}

export default App;
