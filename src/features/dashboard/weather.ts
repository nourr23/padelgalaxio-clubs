export type WeatherInfo = {
  temperatureC: number;
  humidityPercent: number;
  description: string;
  condition: "clear" | "cloudy" | "rain" | "snow" | "fog" | "storm";
} | null;

type GeocodingResult = {
  results?: Array<{ latitude: number; longitude: number; name: string }>;
};

type ForecastResult = {
  current?: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
  };
};

function mapWeatherCode(code: number): {
  description: string;
  condition: "clear" | "cloudy" | "rain" | "snow" | "fog" | "storm";
} {
  if (code === 0) {
    return { description: "Clear skies — great visibility for court play.", condition: "clear" };
  }
  if (code <= 3) {
    return { description: "Partly cloudy with good playing conditions.", condition: "cloudy" };
  }
  if (code <= 48) {
    return { description: "Foggy conditions — check visibility on outdoor courts.", condition: "fog" };
  }
  if (code <= 67 || code === 80 || code === 81) {
    return { description: "Rain expected — consider indoor courts today.", condition: "rain" };
  }
  if (code <= 77 || code === 82 || code === 85 || code === 86) {
    return { description: "Snow or sleet — outdoor courts may be unavailable.", condition: "snow" };
  }
  if (code >= 95) {
    return { description: "Stormy weather — monitor outdoor court safety.", condition: "storm" };
  }
  return { description: "Mild conditions — suitable for most court sessions.", condition: "cloudy" };
}

function buildSummary(
  temp: number,
  humidity: number,
  description: string,
): string {
  const humidityNote =
    humidity < 30
      ? "Low humidity"
      : humidity > 70
        ? "High humidity"
        : "Moderate humidity";
  return `${description} ${humidityNote} at ${Math.round(humidity)}%.`;
}

export async function getWeatherForCity(
  city: string | null,
): Promise<WeatherInfo> {
  const trimmed = city?.trim();
  if (!trimmed) return null;

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=en&format=json`,
      { next: { revalidate: 3600 } },
    );
    if (!geoRes.ok) return null;

    const geo = (await geoRes.json()) as GeocodingResult;
    const location = geo.results?.[0];
    if (!location) return null;

    const forecastRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`,
      { next: { revalidate: 1800 } },
    );
    if (!forecastRes.ok) return null;

    const forecast = (await forecastRes.json()) as ForecastResult;
    const current = forecast.current;
    if (!current) return null;

    const { description, condition } = mapWeatherCode(current.weather_code);

    return {
      temperatureC: Math.round(current.temperature_2m),
      humidityPercent: Math.round(current.relative_humidity_2m),
      description: buildSummary(
        current.temperature_2m,
        current.relative_humidity_2m,
        description,
      ),
      condition,
    };
  } catch {
    return null;
  }
}
