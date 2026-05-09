import dotenv from "dotenv";
import axios from "axios";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, ".env"),
  quiet: true,
});

const API_KEY = process.env.WEATHER_API_KEY;

if (!API_KEY) {
  console.error("CRITICAL ERROR: WEATHER_API_KEY is not defined in .env file.");
  console.error("Current directory:", process.cwd());
  console.error("__dirname:", __dirname);
}

/**
 * MOCK DATA FOR RESOURCES
 */
const CITY_GUIDES = {
  "london": "London is the capital of England and has a temperate oceanic climate. It's known for frequent light rain and fog. The elevation is about 11 meters above sea level.",
  "paris": "Paris, the City of Light, has a mild climate. Summers are warm and pleasant (average 25°C), while winters can be cool (average 5°C).",
  "new-york": "New York City has a humid subtropical climate. It experiences hot, humid summers and cold winters with occasional snow. It is located at the mouth of the Hudson River.",
};

const server = new Server(
  {
    name: "weather-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {
        subscribe: true,
        listChanged: true,
      },
      prompts: {},
    },
  }
);

/**
 * LIST TOOLS
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_live_weather_from_api",
        description: "Fetch real-time weather from external OpenWeather API using MCP connector.",
        inputSchema: {
          type: "object",
          properties: {
            city: {
              type: "string",
              description: "City name",
            },
          },
          required: ["city"],
        },
      },
      {
        name: "get_weather_forecast",
        description: "Fetch a 5-day weather forecast (3-hour intervals) for a city.",
        inputSchema: {
          type: "object",
          properties: {
            city: {
              type: "string",
              description: "City name",
            },
          },
          required: ["city"],
        },
      },
      {
        name: "get_city_guide",
        description: "Get a text guide about a city's climate and history. Use this if you need background info about a city.",
        inputSchema: {
          type: "object",
          properties: {
            city: {
              type: "string",
              description: "City name (e.g., 'london', 'paris', 'new-york')",
            },
          },
          required: ["city"],
        },
      },
    ],
  };
});

/**
 * LIST RESOURCES
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  console.error("LISTING RESOURCES");
  return {
    resources: Object.keys(CITY_GUIDES).map(city => ({
      uri: `city://guides/${city}`,
      name: `${city.charAt(0).toUpperCase() + city.slice(1)} City Guide`,
      description: `A brief climate and history guide for ${city}`,
      mimeType: "text/plain",
    })),
  };
});

/**
 * LIST RESOURCE TEMPLATES
 */
server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return {
    resourceTemplates: [
      {
        uriTemplate: "city://guides/{city}",
        name: "City Guide",
        description: "A brief climate and history guide for a specific city",
        mimeType: "text/plain",
      },
    ],
  };
});

/**
 * READ RESOURCE
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  console.error("READING RESOURCE:", uri);
  const cityMatch = uri.match(/^city:\/\/guides\/(.+)$/);
  
  if (!cityMatch) {
    throw new Error("Invalid resource URI");
  }

  const cityId = cityMatch[1];
  const guide = CITY_GUIDES[cityId];

  if (!guide) {
    throw new Error(`Guide for city "${cityId}" not found`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: "text/plain",
        text: guide,
      },
    ],
  };
});

/**
 * LIST PROMPTS
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "weather-expert-report",
        description: "Generate a professional weather report including local climate context.",
        arguments: [
          {
            name: "city",
            description: "The city to report on",
            required: true,
          },
        ],
      },
    ],
  };
});

/**
 * GET PROMPT
 */
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name !== "weather-expert-report") {
    throw new Error("Unknown prompt");
  }

  const city = request.params.arguments?.city || "unknown city";

  return {
    description: `A professional weather report for ${city}`,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `You are a professional Weather Consultant. Please follow these steps for ${city}:
1. Fetch the current weather using 'get_live_weather_from_api'.
2. Fetch the city guide using 'get_city_guide' to understand the local climate context.
3. Combine this information into a professional report.
4. End with a unique "Traveler's Tip" based on the weather and the city's history.`,
        },
      },
    ],
  };
});

/**
 * TOOL EXECUTION
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error("TOOL EXECUTED:", name, args);

  if (name === "get_live_weather_from_api") {
    const city = args.city;

    try {
      const response = await axios.get(
        "https://api.openweathermap.org/data/2.5/weather",
        {
          params: {
            q: city,
            appid: API_KEY,
            units: "metric",
          },
        }
      );

      const data = response.data;

      const result = `
Weather in ${data.name}

Temperature: ${data.main.temp}°C
Feels Like: ${data.main.feels_like}°C
Condition: ${data.weather[0].description}
Humidity: ${data.main.humidity}%
Wind Speed: ${data.wind.speed} m/s
`;

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
        console.error("WEATHER ERROR:", error.response?.data || error.message);
      return {
        content: [
          {
            type: "text",
            text: `Weather API Error: ${error.response?.data?.message || error.message}`,
          },
        ],
      };
    }
  }

  if (name === "get_weather_forecast") {
    const city = args.city;

    try {
      const response = await axios.get(
        "https://api.openweathermap.org/data/2.5/forecast",
        {
          params: {
            q: city,
            appid: API_KEY,
            units: "metric",
          },
        }
      );

      const data = response.data;
      
      const forecasts = data.list.slice(0, 5).map(item => {
        return `${item.dt_txt}: ${item.main.temp}°C, ${item.weather[0].description}`;
      }).join("\n");

      const result = `
5-Day Forecast (next 15 hours) for ${data.city.name}:

${forecasts}
`;

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      console.error("FORECAST ERROR:", error.response?.data || error.message);
      return {
        content: [
          {
            type: "text",
            text: `Forecast API Error: ${error.response?.data?.message || error.message}`,
          },
        ],
      };
    }
  }

  if (name === "get_city_guide") {
    const city = args.city.toLowerCase().replace(" ", "-");
    const guide = CITY_GUIDES[city];

    if (!guide) {
      return {
        content: [{ type: "text", text: `Sorry, I don't have a guide for ${args.city} yet. Available cities: ${Object.keys(CITY_GUIDES).join(", ")}` }],
      };
    }

    return {
      content: [{ type: "text", text: guide }],
    };
  }

  throw new Error("Unknown tool");
});

/**
 * START SERVER
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();