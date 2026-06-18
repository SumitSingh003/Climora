import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import { authRouter, userRouter, carbonRouter } from './server_routes';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Conditional MongoDB Connection
  let mongoUri = process.env.MONGO_URI;
  if (mongoUri && mongoUri.includes('<')) {
    mongoUri = undefined;
  }

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB');
    } catch (err) {
      console.error('MongoDB connection error:', err);
      process.env.MONGO_URI = ''; // Fallback to mock data
      console.warn('Falling back to mock data arrays for testing due to connection error.');
    }
  } else {
    process.env.MONGO_URI = ''; // Ensure empty for route checks
    console.warn('MONGO_URI is not set. Using mock data arrays for testing.');
  }

  // --- API Routes ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', dbConnected: mongoose.connection.readyState === 1 });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/user', userRouter);
  app.use('/api/carbon', carbonRouter);

  // Example proxy for Gemini API
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, context } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
         res.status(401).json({ error: 'Gemini API key is required inside .env' });
         return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an AI assistant for Climora, an environmental and health monitoring app. 
      Help the user with pollution queries, health guidance, carbon footprint tips, emergency assistance.
      Context: ${JSON.stringify(context || {})}
      ${context?.targetLanguage ? `IMPORTANT: You must respond in the language corresponding to language code: ${context.targetLanguage}.` : ''}
      
      User message: ${message}`;
      
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
      });
      res.json({ text: response.text });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch AI response' });
    }
  });

  // Proxy for WAQI (Air Quality) by City
  app.get('/api/aqi/:city', async (req, res) => {
      try {
          const { city } = req.params;
          
          try {
              // Use OpenStreetMap Nominatim to first search for the coordinates of this city
              const geocodeResponse = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`, {
                  headers: { 'User-Agent': 'Climora/1.0 (contact@climora.app)' }
              });
              
              if (geocodeResponse.data && geocodeResponse.data.length > 0) {
                  const firstResult = geocodeResponse.data[0];
                  const lat = firstResult.lat;
                  const lng = firstResult.lon;
                  
                  // Use Open-Meteo (Highly accurate 500m atmospheric model representation for that coordinate)
                  const [airRep, weatherRep] = await Promise.all([
                      axios.get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`),
                      axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m`)
                  ]);

                  const airCurrent = airRep.data?.current;
                  const weatherCurrent = weatherRep.data?.current;

                  if (airCurrent) {
                      res.json({
                          status: 'ok',
                          data: {
                              aqi: airCurrent.us_aqi,
                              isLocalEstimate: true,
                              city: {
                                  name: firstResult.display_name.split(',')[0] || city
                              },
                              iaqi: {
                                  pm25: { v: airCurrent.pm2_5 },
                                  pm10: { v: airCurrent.pm10 },
                                  o3: { v: airCurrent.ozone },
                                  no2: { v: airCurrent.nitrogen_dioxide },
                                  co: { v: airCurrent.carbon_monoxide },
                                  so2: { v: airCurrent.sulphur_dioxide },
                                  t: { v: weatherCurrent?.temperature_2m || 0 },
                                  w: { v: weatherCurrent?.wind_speed_10m || 0 }
                              }
                          }
                      });
                      return;
                  }
              }
          } catch (cityResolveErr) {
              console.warn('City resolution to OpenMeteo failed, falling back to WAQI:', cityResolveErr);
          }

          const apiKey = process.env.WAQI_API_KEY;
          if(!apiKey) {
             res.json({ data: { aqi: 120, city: { name: city }, dominentpol: 'pm25', iaqi: { pm25: { v: 120 }, pm10: { v: 60 } } } }); // Mock
             return;
          }
          const response = await axios.get(`https://api.waqi.info/feed/${city}/?token=${apiKey}`);
          res.json(response.data);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch AQI' });
      }
  });
  
  // Proxy for AQI by Geo
  app.get('/api/aqi/geo/:lat/:lng', async (req, res) => {
      try {
          const { lat, lng } = req.params;
          
          try {
              // Fetch coordinates specific localized air quality from Open-Meteo (mathematically interpolated for actual coordinates)
              const [airRep, weatherRep] = await Promise.all([
                  axios.get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`),
                  axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m`)
              ]);

              const airCurrent = airRep.data?.current;
              const weatherCurrent = weatherRep.data?.current;

              if (airCurrent) {
                  // Format data as a direct layout-safe match for the AQI dashboard
                  res.json({
                      status: 'ok',
                      data: {
                          aqi: airCurrent.us_aqi,
                          isLocalEstimate: true,
                          city: {
                              name: 'Local Estimate'
                          },
                          iaqi: {
                              pm25: { v: airCurrent.pm2_5 },
                              pm10: { v: airCurrent.pm10 },
                              o3: { v: airCurrent.ozone },
                              no2: { v: airCurrent.nitrogen_dioxide },
                              co: { v: airCurrent.carbon_monoxide },
                              so2: { v: airCurrent.sulphur_dioxide },
                              t: { v: weatherCurrent?.temperature_2m || 0 },
                              w: { v: weatherCurrent?.wind_speed_10m || 0 }
                          }
                      }
                  });
                  return;
              }
          } catch (openMeteoErr) {
              console.warn('OpenMeteo fetch failed, falling back to WAQI:', openMeteoErr);
          }

          // Fallback to WAQI
          const apiKey = process.env.WAQI_API_KEY;
          if(!apiKey) {
             res.json({ data: { aqi: 85, city: { name: 'Mock Location' }, dominentpol: 'pm25', iaqi: { pm25: { v: 85 }, pm10: { v: 40 } } } }); // Mock
             return;
          }
          const response = await axios.get(`https://api.waqi.info/feed/geo:${lat};${lng}/?token=${apiKey}`);
          res.json(response.data);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch AQI' });
      }
  });

  // Reverse Geocoding Proxy to bypass browser CORS / User-Agent blocks
  app.get('/api/geocode/reverse', async (req, res) => {
      try {
          const { lat, lng } = req.query;
          if (!lat || !lng) {
              res.status(400).json({ error: 'lat and lng parameters are required' });
              return;
          }
          const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`, {
              headers: {
                  'User-Agent': 'Climora/1.0 (contact@climora.app)'
              }
          });
          res.json(response.data);
      } catch (err) {
          console.error('Reverse Geocode Error:', err);
          res.status(500).json({ error: 'Failed to reverse geocode' });
      }
  });

  // Geocoding Search Proxy
  app.get('/api/geocode/search', async (req, res) => {
      try {
          const { q } = req.query;
          if (!q) {
              res.status(400).json({ error: 'q parameter is required' });
              return;
          }
          const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(String(q))}&limit=5`, {
              headers: {
                  'User-Agent': 'Climora/1.0 (contact@climora.app)'
              }
          });
          res.json(response.data);
      } catch (err) {
          console.error('Geocode Search Error:', err);
          res.status(500).json({ error: 'Failed to search location' });
      }
  });

  // Proxy for Prediction API
  app.post('/api/predict', async (req, res) => {
      try {
          const response = await axios.post('https://climora-prediction-api.onrender.com/predict', req.body);
          res.json(response.data);
      } catch (err) {
          console.error('Prediction API error:', err);
          res.status(500).json({ error: 'Failed to fetch prediction' });
      }
  });

  // --- Vite Middleware (Development) or Static Serving (Production) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
