import axios from 'axios';

export async function getCustomForecast(lat: number, lng: number) {
  try {
    // 1. Fetch 8 past days of daily weather
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum,wind_speed_10m_mean,pressure_msl_mean&timezone=auto&past_days=8&forecast_days=1`;
    
    // 2. Fetch 8 past days of hourly AQI
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi&timezone=auto&past_days=8&forecast_days=1`;

    const [weatherRes, aqiRes] = await Promise.all([
      axios.get(weatherUrl),
      axios.get(aqiUrl)
    ]);

    const dailyWeather = weatherRes.data.daily;
    const hourlyAqi = aqiRes.data.hourly;

    // 3. Group hourly AQI by day to get daily means and max
    const aqiByDay: Record<string, any> = {};

    for (let i = 0; i < hourlyAqi.time.length; i++) {
        const date = hourlyAqi.time[i].split('T')[0];
        if (!aqiByDay[date]) {
            aqiByDay[date] = { 
                pm10: [], pm2_5: [], carbon_monoxide: [], 
                nitrogen_dioxide: [], sulphur_dioxide: [], 
                ozone: [], us_aqi: [] 
            };
        }
        if (hourlyAqi.pm10[i] != null) aqiByDay[date].pm10.push(hourlyAqi.pm10[i]);
        if (hourlyAqi.pm2_5[i] != null) aqiByDay[date].pm2_5.push(hourlyAqi.pm2_5[i]);
        if (hourlyAqi.carbon_monoxide[i] != null) aqiByDay[date].carbon_monoxide.push(hourlyAqi.carbon_monoxide[i]);
        if (hourlyAqi.nitrogen_dioxide[i] != null) aqiByDay[date].nitrogen_dioxide.push(hourlyAqi.nitrogen_dioxide[i]);
        if (hourlyAqi.sulphur_dioxide[i] != null) aqiByDay[date].sulphur_dioxide.push(hourlyAqi.sulphur_dioxide[i]);
        if (hourlyAqi.ozone[i] != null) aqiByDay[date].ozone.push(hourlyAqi.ozone[i]);
        if (hourlyAqi.us_aqi[i] != null) aqiByDay[date].us_aqi.push(hourlyAqi.us_aqi[i]);
    }

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;

    const recentDays = [];

    // Construct the payload structure exactly as expected by the Python model
    // We only need the first 8 chronological past days
    for (let i = 0; i < 8; i++) {
        const date = dailyWeather.time[i];
        const aqiStats = aqiByDay[date] || { pm10: [], pm2_5: [], carbon_monoxide: [], nitrogen_dioxide: [], sulphur_dioxide: [], ozone: [], us_aqi: [] };
        
        recentDays.push({
            date,
            temperature_2m_mean: dailyWeather.temperature_2m_mean[i] ?? 0,
            relative_humidity_2m_mean: dailyWeather.relative_humidity_2m_mean[i] ?? 0,
            precipitation_sum: dailyWeather.precipitation_sum[i] ?? 0,
            wind_speed_10m_mean: dailyWeather.wind_speed_10m_mean[i] ?? 0,
            pressure_msl_mean: dailyWeather.pressure_msl_mean[i] ?? 0,
            pm10: avg(aqiStats.pm10),
            pm2_5: avg(aqiStats.pm2_5),
            carbon_monoxide: avg(aqiStats.carbon_monoxide),
            nitrogen_dioxide: avg(aqiStats.nitrogen_dioxide),
            sulphur_dioxide: avg(aqiStats.sulphur_dioxide),
            ozone: avg(aqiStats.ozone),
            aqi: avg(aqiStats.us_aqi),
            aqi_max: max(aqiStats.us_aqi)
        });
    }

    // 4. POST to your successfully deployed Render API
    const predictRes = await axios.post('/api/predict', {
        recent_days: recentDays
    });

    return {
        predictions: predictRes.data.predictions,
        model_name: predictRes.data.model_name,
        historical: recentDays
    }; 
  } catch (err) {
    console.error("Custom prediction error:", err);
    throw err;
  }
}
