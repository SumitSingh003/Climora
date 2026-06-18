import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CloudRain, Wind, Thermometer, MapPin, AlertTriangle, RefreshCw, Search, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getCustomForecast } from '../utils/prediction';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import L from 'leaflet';
import { toast } from 'sonner';

// Fix for default Leaflet icon in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Dashboard() {
  const { profile } = useAuth();
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [aqiData, setAqiData] = useState<any>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [resolvedLocationName, setResolvedLocationName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const alertTriggered = useRef(false);

  // Manual search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchLocationName = async (lat: number, lng: number) => {
    try {
      const res = await axios.get(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
      if (res.data) {
        const address = res.data.address;
        if (address) {
          const locName = address.suburb || address.town || address.village || address.neighbourhood || address.city_district || address.hamlet || address.city || address.county;
          if (locName) {
            setResolvedLocationName(locName);
            return;
          }
        }
        if (res.data.display_name) {
          const parts = res.data.display_name.split(',');
          if (parts.length > 0) {
            setResolvedLocationName(parts.slice(0, 2).join(', ').trim());
            return;
          }
        }
      }
    } catch (err) {
      console.error("Reverse geocoding failed, fallback to WAQI city name", err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await axios.get(`/api/geocode/search?q=${encodeURIComponent(query)}`);
      setSearchResults(res.data || []);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setLocation({ lat, lng: lon });
    
    // Extract location display name
    const address = result.address;
    let locName = '';
    if (address) {
      locName = address.suburb || address.town || address.village || address.neighbourhood || address.city_district || address.hamlet || address.city || address.county;
    }
    if (!locName && result.display_name) {
      const parts = result.display_name.split(',');
      locName = parts[0];
    }
    setResolvedLocationName(locName || result.display_name);
    setSearchQuery('');
    setSearchResults([]);
  };

  const requestLocation = () => {
    setLoading(true);
    setError('');
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ lat, lng });
          fetchLocationName(lat, lng);
        },
        (err) => {
          setError("Location access denied or timed out. Feel free to search manually below!");
          setLocation({ lat: 28.6139, lng: 77.2090 }); // Default to New Delhi
          setResolvedLocationName('New Delhi');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setError("Geolocation not supported. Try using our custom Search tool.");
      setLocation({ lat: 28.6139, lng: 77.2090 });
      setResolvedLocationName('New Delhi');
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    if (location) {
      alertTriggered.current = false;
      fetchAqi(location.lat, location.lng);
    }
  }, [location]);

  const [aqiForecast, setAqiForecast] = useState<any[]>([]);
  const [historicalAqi, setHistoricalAqi] = useState<any[]>([]);

  const fetchAqi = async (lat: number, lng: number) => {
    try {
      const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
      if (weatherRes.data && weatherRes.data.current_weather) {
          setWeatherData(weatherRes.data.current_weather);
      }
    } catch (e) {
      console.error("Failed to fetch weather data", e);
    }

    try {
      const customPred = await getCustomForecast(lat, lng);
      if (customPred && customPred.predictions) {
         const today = new Date();
         const futureDays = [1, 2, 3].map(offset => {
           const nextDay = new Date();
           nextDay.setDate(today.getDate() + offset);
           return {
             date: nextDay.toISOString().split('T')[0],
             aqiMax: customPred.predictions[`day_${offset}`]
           };
         });
         setAqiForecast(futureDays);
         if (customPred.historical) {
            setHistoricalAqi(customPred.historical);
         }
      }
    } catch (e) {
       console.error("Failed to fetch custom AQI forecast", e);
    }

    try {
      const res = await axios.get(`/api/aqi/geo/${lat}/${lng}`);
      if (res.data && res.data.data) {
          const fetchedAqi = res.data.data.aqi;
          setAqiData(res.data.data);
          
          // Notifications Logic
          triggerAlert(fetchedAqi, res.data.data);


      } else {
          setError("Failed to parse AQI data");
      }
    } catch (err) {
      setError("Failed to fetch AQI data");
    } finally {
      setLoading(false);
    }
  };

  const triggerAlert = (aqiValue: number, data: any, forceTest: boolean = false) => {
    let threshold = 100;
    let isSensitive = false;
    let conditionsStr = '';
    
    if (profile?.medicalConditions && profile.medicalConditions.length > 0) {
      const conditions = profile.medicalConditions.map((c: string) => c.toLowerCase());
      if (conditions.includes('asthma') || conditions.includes('copd') || conditions.includes('allergies')) {
        threshold = 50;
        isSensitive = true;
        conditionsStr = profile.medicalConditions.join(', ');
      }
    }

    if ((aqiValue >= threshold && !alertTriggered.current) || forceTest) {
       if (!forceTest) alertTriggered.current = true;
       const message = isSensitive 
          ? `AQI is ${aqiValue}. Because of your profile (${conditionsStr}), you are at high risk. Wear a mask and limit outdoor activities!`
          : `AQI is ${aqiValue} (${getAqiStatus(aqiValue)}). Wear a mask and limit outdoor activities.`;

       // In-app alert
       toast.error('Health & Pollution Warning', {
         description: message,
         duration: 8000,
       });

       // Device Notification
       if ('Notification' in window) {
         const iconUrl = window.location.origin + '/vite.svg';
         const notify = () => {
           try {
             new Notification('Climora Alert', { 
               body: message, 
               icon: iconUrl,
               requireInteraction: true
             });
           } catch (e) {
             console.error("System notification failed", e);
             toast.error("System notification failed. Check browser settings.");
           }
         };

         if (Notification.permission === 'granted') {
           notify();
         } else if (Notification.permission !== 'denied') {
           Notification.requestPermission().then(permission => {
             if (permission === 'granted') notify();
           });
         }
       }
    }
  };

  const getAqiColor = (aqi: number) => {
    if (aqi <= 50) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (aqi <= 100) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (aqi <= 150) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (aqi <= 200) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (aqi <= 300) return 'text-purple-600 bg-purple-50 border-purple-200';
    return 'text-rose-900 bg-rose-50 border-rose-200';
  };

  const getAqiStatus = (aqi: number) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  const shareLocation = async () => {
    if (!location) {
      toast.error("Location not available to share.");
      return;
    }
    const mapsUrl = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    const shareData = {
      title: 'My Current Location (Climora)',
      text: `Here is my current location: ${resolvedLocationName || 'Unknown'}`,
      url: mapsUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("Location shared successfully!");
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast.error("Failed to share location.");
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.text} \n ${shareData.url}`);
        toast.success("Location link copied to clipboard!");
      } catch (err) {
        toast.error("Failed to copy location to clipboard.");
      }
    }
  };

  const trendData = useMemo(() => {
    const data: any[] = [];
    if (historicalAqi) {
      historicalAqi.forEach((d: any) => data.push({ 
        date: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), 
        historicalAqi: Math.round(d.aqi_max), 
        forecastAqi: null 
      }));
    }
    
    // Attempt to stitch the line visually from the last historical point if it exists
    if (historicalAqi && historicalAqi.length > 0 && aqiForecast && aqiForecast.length > 0) {
       const lastHist = historicalAqi[historicalAqi.length - 1];
       data.push({
           date: new Date(lastHist.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
           historicalAqi: null,
           forecastAqi: Math.round(lastHist.aqi_max)
       });
    }

    if (aqiForecast) {
      aqiForecast.forEach((d: any) => data.push({ 
        date: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), 
        historicalAqi: null, 
        forecastAqi: Math.round(d.aqiMax) 
      }));
    }
    return data;
  }, [historicalAqi, aqiForecast]);

  if (loading) return <div className="p-8 text-center text-slate-400 font-medium">Loading Dashboard Data...</div>;

  const aqiValue = aqiData?.aqi || 0;
  const aqiColorClass = getAqiColor(aqiValue);
  const aqiStatus = getAqiStatus(aqiValue);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
         <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Environmental Dashboard</h1>
            <div className="flex items-center text-slate-400 mt-2 flex-wrap gap-2">
               <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
               <span className="mr-3 font-semibold text-slate-700">
                 {resolvedLocationName || (aqiData?.isLocalEstimate ? '' : aqiData?.city?.name) || 'Unknown Location'}
                 {!aqiData?.isLocalEstimate && resolvedLocationName && aqiData?.city?.name && resolvedLocationName.toLowerCase() !== aqiData.city.name.toLowerCase() && (
                   <span className="text-slate-400 font-normal ml-2 text-xs block md:inline">
                     ({aqiData.city.name} Station)
                   </span>
                 )}
                 {aqiData?.isLocalEstimate && (
                   <span className="text-emerald-600 font-medium ml-2 text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider inline-block">
                     Direct Location Estimate
                   </span>
                 )}
               </span>
               <button 
                 onClick={requestLocation} 
                 className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors shrink-0"
               >
                 <RefreshCw className="h-3 w-3 mr-1.5" />
                 Update Location
               </button>
               <button 
                 onClick={shareLocation} 
                 className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors shrink-0"
               >
                 <Share2 className="h-3 w-3 mr-1.5" />
                 Share
               </button>
               <button 
                 onClick={() => {
                   if ('Notification' in window) {
                     Notification.requestPermission().then(permission => {
                       if (permission === 'granted') {
                         triggerAlert(aqiValue || 150, aqiData, true);
                         toast.success('System Notifications are enabled!');
                       } else {
                         toast.error('Notification permission denied. To see system notifications, try opening the app in a new tab.');
                       }
                     });
                   } else {
                     toast.error('System notifications are not supported in this browser.');
                   }
                 }}
                 className="flex items-center text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
               >
                 <AlertTriangle className="h-3 w-3 mr-1.5" />
                 Test Notifications
               </button>
            </div>
         </div>

         {/* Location Search Input */}
         <div className="relative w-full md:w-80 shrink-0">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
               <Search className="h-4 w-4 text-slate-400 mr-2" />
               <input 
                  type="text" 
                  placeholder="Search live city/area (e.g., Kharar)" 
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
               />
               {searching && (
                 <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-emerald-500 border-t-transparent"></div>
               )}
            </div>

            {/* Lookahead Dropdown list */}
            {searchResults.length > 0 && (
               <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                  {searchResults.map((result: any, index: number) => (
                     <div 
                        key={index}
                        onClick={() => selectSearchResult(result)}
                        className="px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer text-xs text-slate-600 font-medium border-b border-slate-50 last:border-none flex flex-col gap-0.5"
                     >
                        <span className="text-slate-800 font-semibold truncate">
                          {result.display_name.split(',')[0]}
                        </span>
                        <span className="text-slate-400 truncate text-[10px]">
                          {result.display_name}
                        </span>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>

      {error && (
         <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md flex items-start border border-yellow-200">
            <AlertTriangle className="h-5 w-5 mr-3 shrink-0" />
            <p className="text-sm">{error}</p>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* AQI Main Card */}
         <div className={`md:col-span-1 rounded-2xl border p-6 flex flex-col items-center justify-center text-center space-y-4 ${aqiColorClass}`}>
            <h3 className="text-sm font-semibold uppercase tracking-wider opacity-80">Current AQI</h3>
            <div className="text-6xl font-black tracking-tighter">{aqiValue}</div>
            <div className="text-lg font-medium px-4 py-1 rounded-full bg-white/50 backdrop-blur-sm">
               {aqiStatus}
            </div>
         </div>

         {/* Pollutants Grid */}
         <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center text-center">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">PM2.5</div>
               <div className="text-2xl font-bold text-slate-800">{aqiData?.iaqi?.pm25?.v || '--'} <span className="text-[10px] font-normal text-slate-500">µg/m³</span></div>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center text-center">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">PM10</div>
               <div className="text-2xl font-bold text-slate-800">{aqiData?.iaqi?.pm10?.v || '--'} <span className="text-[10px] font-normal text-slate-500">µg/m³</span></div>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center text-center">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">O3 (Ozone)</div>
               <div className="text-2xl font-bold text-slate-800">{aqiData?.iaqi?.o3?.v || '--'}</div>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center text-center">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">NO2</div>
               <div className="text-2xl font-bold text-slate-800">{aqiData?.iaqi?.no2?.v || '--'}</div>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center text-center">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center justify-center">
                 <Thermometer className="h-3 w-3 text-slate-400 mr-1" /> Temperature
               </div>
               <div className="text-2xl font-bold text-slate-800">
                 {aqiData?.iaqi?.t?.v || '--'}°C
               </div>
            </div>
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center text-center">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 flex items-center justify-center">
                 <Wind className="h-3 w-3 text-slate-400 mr-1" /> Wind
               </div>
               <div className="text-2xl font-bold text-slate-800">
                  {(() => {
                    let speedVal: string | number = '--';
                    if (aqiData?.iaqi?.w?.v !== undefined && aqiData.iaqi.w.v !== null) {
                        const num = Number(aqiData.iaqi.w.v);
                        speedVal = isNaN(num) ? String(aqiData.iaqi.w.v) : parseFloat(num.toFixed(4));
                    } else if (weatherData?.windspeed !== undefined) {
                        // weatherData windspeed is in km/h, wait no, let's just display it and add km/h if it's from weatherData, or convert to m/s
                        speedVal = parseFloat((weatherData.windspeed / 3.6).toFixed(4));
                    }

                    let dirStr = '';
                    let dMatch = aqiData?.iaqi?.wd?.v !== undefined ? Number(aqiData.iaqi.wd.v) : 
                                  weatherData?.winddirection !== undefined ? Number(weatherData.winddirection) : NaN;
                    
                    if (!isNaN(dMatch)) {
                        const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
                        dirStr = ` ${arr[Math.floor((dMatch / 22.5) + 0.5) % 16]}`;
                    }

                    return <>{speedVal} <span className="text-sm font-medium text-slate-500">m/s{dirStr}</span></>;
                  })()}
               </div>
            </div>
         </div>
      </div>
      
      {/* Map Section */}
      {location && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
             <h3 className="text-sm font-bold text-slate-800 mb-4 px-2 tracking-tight">Live Pollution Map</h3>
             <div className="h-80 w-full rounded-2xl overflow-hidden border border-slate-100">
                <MapContainer center={[location.lat, location.lng]} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                   <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                   />
                   <Marker position={[location.lat, location.lng]}>
                      <Popup>
                         {resolvedLocationName || 'Selected Location'}. AQI: {aqiValue}
                      </Popup>
                   </Marker>
                   <Circle 
                      center={[location.lat, location.lng]} 
                      radius={5000} 
                      pathOptions={{ color: aqiValue > 100 ? '#e11d48' : '#10b981', fillColor: aqiValue > 100 ? '#e11d48' : '#10b981', fillOpacity: 0.2 }}
                   />
                </MapContainer>
             </div>
          </div>
      )}

      {/* AQI Forecast Section */}
      {aqiForecast.length > 0 && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden space-y-6">
             <h3 className="text-sm font-bold text-slate-800 px-2 tracking-tight">3-Day AQI Forecast</h3>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               {aqiForecast.map((dayData, index) => {
                 const fDate = new Date(dayData.date);
                 const dateStr = fDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                 const fAqi = Math.round(dayData.aqiMax);
                 const fColorClass = getAqiColor(fAqi);
                 const fStatus = getAqiStatus(fAqi);
                 
                 return (
                   <div key={index} className={`p-4 rounded-2xl ${fColorClass} flex flex-col items-center justify-center text-center transition-transform hover:scale-105`}>
                      <span className="text-sm font-bold opacity-80 mb-1">{index === 0 ? 'Tomorrow' : dateStr}</span>
                      <span className="text-3xl font-black mb-1">{fAqi}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">{fStatus}</span>
                   </div>
                 );
               })}
             </div>
             {trendData.length > 0 && (
               <div className="mt-8">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Prediction Trend vs Historical (Past 8 Days)</h3>
                 <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                        <Tooltip 
                           contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                           labelStyle={{ fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}
                        />
                        <Area type="monotone" dataKey="historicalAqi" name="Historical API" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorHistorical)" />
                        <Area type="monotone" dataKey="forecastAqi" name="Forecast Prediction" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorForecast)" />
                      </AreaChart>
                    </ResponsiveContainer>
                 </div>
               </div>
             )}
          </div>
      )}

      {/* Pollutants Composition Chart */}
      {aqiData?.iaqi && (() => {
        const pollutants = [
          { name: 'PM2.5', value: aqiData.iaqi.pm25?.v, color: '#ef4444' }, // red-500
          { name: 'PM10', value: aqiData.iaqi.pm10?.v, color: '#f97316' }, // orange-500
          { name: 'O3', value: aqiData.iaqi.o3?.v, color: '#0ea5e9' }, // sky-500
          { name: 'NO2', value: aqiData.iaqi.no2?.v, color: '#8b5cf6' }, // violet-500
          { name: 'CO', value: aqiData.iaqi.co?.v, color: '#f59e0b' }, // amber-500
          { name: 'SO2', value: aqiData.iaqi.so2?.v, color: '#10b981' }, // emerald-500
        ];
        const validData = pollutants
          .filter(p => typeof p.value === 'number' && !isNaN(p.value) && p.value > 0)
          .map(p => ({ ...p, value: Number(p.value.toFixed(2)) }));

        if (validData.length === 0) return null;

        return (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
             <h3 className="text-sm font-bold text-slate-800 mb-4 px-2 tracking-tight">Pollutant Composition</h3>
             <div className="h-80 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                         data={validData}
                         cx="50%"
                         cy="50%"
                         labelLine={false}
                         innerRadius={60}
                         outerRadius={100}
                         paddingAngle={2}
                         dataKey="value"
                         label={({ name, percent }) => percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : null}
                      >
                         {validData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                         ))}
                      </Pie>
                      <Tooltip 
                         formatter={(value: number) => [`${value} µg/m³`, 'Concentration']} 
                         contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                   </PieChart>
                </ResponsiveContainer>
             </div>
          </div>
        );
      })()}
    </motion.div>
  );
}
