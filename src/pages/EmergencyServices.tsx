import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, AlertCircle, Navigation, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface Facility {
  id: number;
  name: string;
  lat: number;
  lon: number;
  type: string;
  tags: any;
}

export default function EmergencyServices() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);

  const emergencyContacts = [
    { name: 'National Emergency', number: '112', type: 'General' },
    { name: 'Police', number: '100', type: 'Security' },
    { name: 'Fire Department', number: '101', type: 'Fire' },
    { name: 'Ambulance', number: '102', type: 'Medical' },
    { name: 'Women Helpline', number: '1091', type: 'Safety' },
  ];

  const requestLocation = () => {
    setLoading(true);
    setError('');
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation({ lat, lng });
          fetchNearbyFacilities(lat, lng);
        },
        (err) => {
          setError("Location access denied. Please enable location to find nearby facilities.");
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation not supported.");
      setLoading(false);
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const fetchNearbyFacilities = async (lat: number, lng: number) => {
    // We use Overpass API to find amenities (hospitals, clinics, pharmacies) within 5km radius
    const radius = 5000;
    const query = `
      [out:json];
      (
        node["amenity"="hospital"](around:${radius},${lat},${lng});
        node["amenity"="clinic"](around:${radius},${lat},${lng});
        node["amenity"="pharmacy"](around:${radius},${lat},${lng});
      );
      out body;
      >;
      out skel qt;
    `;
    try {
       const res = await axios.post('https://overpass-api.de/api/interpreter', query, {
           headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
       });
       
       const data = res.data.elements.filter((el: any) => el.tags && el.tags.name).map((el: any) => ({
           id: el.id,
           name: el.tags.name,
           lat: el.lat,
           lon: el.lon,
           type: el.tags.amenity,
           tags: el.tags
       }));
       setFacilities(data);
    } catch (err) {
       setError("Failed to load nearby facilities from open data map.");
    } finally {
       setLoading(false);
    }
  };

  const getDirectionsUrl = (destLat: number, destLng: number) => {
     if(!location) return '#';
     return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${location.lat},${location.lng};${destLat},${destLng}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
       <div className="flex justify-between items-end">
         <div>
           <h1 className="text-2xl font-bold tracking-tight text-slate-800">Emergency Services</h1>
           <p className="text-slate-400">Quick access to helplines and nearby health facilities.</p>
         </div>
         <button 
           onClick={requestLocation} 
           className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm"
         >
           <RefreshCw className="h-4 w-4 mr-2" />
           Update Location
         </button>
       </div>

       {error && (
         <div className="bg-rose-50 text-rose-800 p-4 rounded-xl flex items-start border border-rose-200 shadow-sm">
            <AlertCircle className="h-5 w-5 mr-3 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
         </div>
       )}

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Helplines */}
          <div className="lg:col-span-1 space-y-4">
             <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 tracking-tight">National Helplines</h2>
             <div className="space-y-3">
                {emergencyContacts.map((contact, idx) => (
                   <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                      <div>
                         <p className="font-bold text-slate-800">{contact.name}</p>
                         <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{contact.type}</p>
                      </div>
                      <a href={`tel:${contact.number}`} className="flex items-center space-x-2 bg-rose-50 text-rose-600 px-4 py-2.5 rounded-xl font-bold hover:bg-rose-100 transition-colors shadow-sm">
                         <Phone className="h-4 w-4" />
                         <span>{contact.number}</span>
                      </a>
                   </div>
                ))}
             </div>
          </div>

          {/* Nearby Facilities */}
          <div className="lg:col-span-2 space-y-4">
             <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                 <h2 className="text-sm font-bold text-slate-800 tracking-tight">Nearby Hospitals & Pharmacies (5km)</h2>
                 {loading && <span className="text-xs font-bold uppercase tracking-wide text-emerald-600 animate-pulse">Searching...</span>}
             </div>
             
             {!loading && facilities.length === 0 && !error && (
                 <div className="bg-slate-50 p-8 text-center rounded-3xl border border-dashed border-slate-200 text-slate-400 font-medium pt-8">
                     No facilities found within 5km radius.
                 </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[600px] overflow-y-auto pr-2">
                 {facilities.map((fac) => (
                     <div key={fac.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                           <div>
                              <h3 className="font-bold text-slate-800 leading-tight">{fac.name}</h3>
                              <span className="inline-block mt-2 uppercase text-[10px] font-bold tracking-widest px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full">
                                 {fac.type}
                              </span>
                           </div>
                           <MapPin className="h-5 w-5 text-slate-300 shrink-0" />
                        </div>
                        {fac.tags['contact:phone'] || fac.tags.phone ? (
                            <p className="text-xs font-bold tracking-wide text-slate-500 mb-4 flex items-center">
                               <Phone className="h-3 w-3 mr-2" /> {fac.tags['contact:phone'] || fac.tags.phone}
                            </p>
                        ) : <div className="h-8"></div>}
                        
                        <div className="flex space-x-2 pt-4 border-t border-slate-100">
                           <a 
                              href={getDirectionsUrl(fac.lat, fac.lon)}
                              target="_blank" rel="noreferrer"
                              className="flex-1 flex items-center justify-center bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200/50"
                           >
                              <Navigation className="h-4 w-4 mr-2" />
                              Directions
                           </a>
                           {(fac.tags['contact:phone'] || fac.tags.phone) && (
                               <a href={`tel:${fac.tags['contact:phone'] || fac.tags.phone}`} className="px-5 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center">
                                  <Phone className="h-4 w-4" />
                               </a>
                           )}
                        </div>
                     </div>
                 ))}
             </div>
          </div>
       </div>
    </motion.div>
  );
}
