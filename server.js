import dotenv from "dotenv";
import axios from "axios";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
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

const server = new Server(
  {
    name: "weather-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
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
        name: "weather_mcp_lookup",
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
    ],
  };
});

/**
 * TOOL EXECUTION
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
   console.error("TOOL EXECUTED");
  console.error("Tool Name:", name);
  console.error("Arguments:", args);
  if (name === "weather_mcp_lookup" || name === "get_live_weather_from_api") {
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
        console.error("FULL ERROR:", error.response?.data || error.message);
      return {
    content: [
      {
        type: "text",
        text: `Weather API Error: ${
          error.response?.data?.message || error.message
        }`,
      },
    ],
  };
    }
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